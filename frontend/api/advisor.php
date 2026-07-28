<?php
/**
 * Yee Lim AI Product Advisor — server-side proxy.
 *
 * The browser POSTs the chat history here; this script grounds the answer in the
 * live product catalogue and (optionally) forwards it to a hosted LLM. The API key
 * stays on the server and is never exposed to visitors.
 *
 * Backend is chosen in config.php (see config.example.php). If no provider/key is
 * configured — or the provider call fails — it falls back to a free, rule-based
 * catalogue matcher so the chatbot always responds.
 *
 * Request  (POST JSON): { "messages": [ {"role":"user|assistant","content":"..."}, ... ] }
 * Response (JSON):      { "reply": "...", "source": "ai" | "catalogue" }
 */

require_once __DIR__ . "/db.php"; // provides $pdo, sets JSON Content-Type

// ─── Method guard ──────────────────────────────────────────────
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["reply" => "Method not allowed.", "source" => "error"]);
    exit;
}

// ─── Rate limit ────────────────────────────────────────────────
// Caps cost/abuse once a paid LLM key is configured. Invisible to real users:
// 30 messages per 10 minutes per client IP, then 429. (Helpers live in db.php.)
$advBucket = "advisor_" . ($_SERVER["REMOTE_ADDR"] ?? "0");
if (ylRateRecentCount($advBucket, 600) >= 30) {
    http_response_code(429);
    echo json_encode([
        "reply"  => "You have sent a lot of messages in a short time. Please wait a minute and try again, or [submit an enquiry](/enquiry).",
        "source" => "error",
    ]);
    exit;
}
ylRateAdd($advBucket);

// ─── Parse + sanitise incoming conversation ────────────────────
$raw  = file_get_contents("php://input");
$data = json_decode($raw, true);
$messages = (is_array($data) && isset($data["messages"]) && is_array($data["messages"]))
    ? $data["messages"]
    : [];

$clean = [];
foreach ($messages as $m) {
    if (!is_array($m)) continue;
    $role    = $m["role"]    ?? "";
    $content = $m["content"] ?? "";
    if (!is_string($content)) continue;
    $content = trim($content);
    if ($content === "" || ($role !== "user" && $role !== "assistant")) continue;
    $clean[] = ["role" => $role, "content" => mb_substr($content, 0, 1000)];
}
// Keep the last 12 turns; trim any leading assistant turns so it starts with a user.
if (count($clean) > 12) $clean = array_slice($clean, -12);
while (!empty($clean) && $clean[0]["role"] !== "user") array_shift($clean);

$lastUser = "";
for ($i = count($clean) - 1; $i >= 0; $i--) {
    if ($clean[$i]["role"] === "user") { $lastUser = $clean[$i]["content"]; break; }
}

// ─── Load the catalogue from the database ──────────────────────
$products = [];
try {
    $stmt = $pdo->query(
        "SELECT id, name, brand, category, short_description, usage_text,
                industries, surfaces, features, status
         FROM products"
    );
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $products = [];
}

// ─── Try the configured LLM provider, else fall back to rules ──
$provider = defined("LLM_PROVIDER") ? strtolower(trim(LLM_PROVIDER)) : "";
$apiKey   = defined("LLM_API_KEY")  ? trim(LLM_API_KEY)              : "";
$model    = defined("LLM_MODEL")    ? trim(LLM_MODEL)                : "";
$baseUrl  = defined("LLM_BASE_URL") ? trim(LLM_BASE_URL)             : "";

$reply = null;
if ($provider !== "" && $apiKey !== "" && !empty($clean)) {
    $system = buildSystemPrompt($products);
    if ($provider === "gemini") {
        $reply = callGemini($apiKey, $model, $system, $clean);
    } elseif ($provider === "anthropic") {
        $reply = callAnthropic($apiKey, $model, $system, $clean);
    } elseif ($provider === "openai") {
        $reply = callOpenAI($apiKey, $model, $baseUrl, $system, $clean);
    }
}

if ($reply !== null && trim($reply) !== "") {
    echo json_encode(["reply" => $reply, "source" => "ai"]);
    exit;
}

echo json_encode(["reply" => ruleBasedReply($lastUser, $products), "source" => "catalogue"]);
exit;


// ════════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════════

function decodeList($value) {
    $decoded = json_decode($value ?? "[]", true);
    return is_array($decoded) ? $decoded : [];
}

// Company facts Ava can answer from, sourced from the live site (contact),
// the About page and the FAQ. Pricing / MOQ / exact lead times stay unpublished
// on purpose so the model always defers those to an enquiry.
function buildCompanyKnowledge() {
    return "Company Knowledge (answer company, logistics and how-to-buy questions ONLY from this):\n"
         . "- Company: Yee Lim Adhesives Industries, a Singapore B2B adhesives and glue manufacturer "
         . "with over 50 years of experience, one of the biggest and earliest adhesive manufacturers in Singapore.\n"
         . "- History: started as a shoe factory, then shifted to commercial and industrial adhesives; "
         . "grew from home-based manufacturing to a fully operational factory with over 20,000 square feet of production space.\n"
         . "- Tagline: For a Better Job. Mission: produce the best quality adhesives and provide the best customer service.\n"
         . "- Brands: Deer, Horsemen, Premier and Rhino, plus Others and Accessories (for example spray guns).\n"
         . "- Serves: construction, chemical, carpentry, furniture, marine, hardware, and leather and craft industries, plus OEM services.\n"
         . "- Certification: some products carry the Singapore Green Label (low VOC, eco friendly), for example Premier Brand G100.\n"
         . "- Product types: normal adhesives and spray adhesives; application methods include hand sprayed, machine sprayed, rolled and brushed.\n"
         . "- Custom formulation: if a required adhesive is not in the catalogue, Yee Lim can specially formulate one to suit the job; invite an enquiry.\n"
         . "- Export: some products are exported overseas and export can be arranged; for availability in a local market, ask the buyer to enquire.\n"
         . "- Delivery: offered for orders above a minimum quantity; smaller orders needing delivery can be arranged for a small fee; buyers may also collect from the office.\n"
         . "- Stock and lead time: smaller quantities are usually ready stock; larger quantities typically need about 3 to 5 days from order to delivery. Confirm exact timing via an enquiry.\n"
         . "- Pricing, minimum order quantity and exact lead times are NOT published; always direct these to an enquiry.\n"
         . "- Contact: 1 Ang Mo Kio Street 65, #03-17, Singapore 569063. Phone +65 8875 5786. WhatsApp 6588755786. "
         . "Email contact@yeelimadhesives.com.sg. Enquiry form at /enquiry, contact page at /contact.";
}

function buildSystemPrompt($products) {
    $lines = [];
    foreach ($products as $p) {
        $ind  = implode(", ", decodeList($p["industries"] ?? "[]"));
        $surf = implode(", ", decodeList($p["surfaces"] ?? "[]"));
        $lines[] = "- id={$p['id']} | {$p['name']} ({$p['brand']}) | {$p['short_description']}"
                 . " | Industries: {$ind} | Surfaces: {$surf} | {$p['status']}";
    }
    $catalogue = implode("\n", $lines);

    return "You are Ava, the product advisor and company assistant for Yee Lim Adhesives Industries, "
         . "a Singapore B2B adhesives manufacturer with over 50 years of experience.\n\n"
         . "Answer buyers' questions about the company, its products, and how to buy, using ONLY the "
         . "Company Knowledge and Catalogue below. Be precise, professional and brief (under 100 words "
         . "unless asked to compare or explain in detail). No emoji, no filler.\n\n"
         . "Language: reply in the SAME language the user writes in (English or Simplified Chinese). "
         . "Always write the company name as Yee Lim, and all brand names, product names and model "
         . "numbers, in their original Latin letters (for example Yee Lim, Deer Brand 101). Never "
         . "translate or transliterate these names into Chinese.\n\n"
         . "When you recommend a product, link it exactly like this: "
         . "[Product Name](/product-detail?id=ID) using its id from the catalogue.\n\n"
         . buildCompanyKnowledge() . "\n\n"
         . "Catalogue:\n" . $catalogue . "\n\n"
         . "Rules:\n"
         . "- Answer company, delivery, export, lead-time and how-to-buy questions from the Company Knowledge above.\n"
         . "- Only recommend products from the catalogue above. Never invent products, specifications, prices or facts.\n"
         . "- If a product is marked Unavailable, do not present it as in stock. Say it is currently "
         . "unavailable and suggest enquiring about availability.\n"
         . "- If the need is unclear, ask one short clarifying question (which surfaces, what conditions).\n"
         . "- If nothing fits, or the answer is not in the knowledge above, say so briefly and point them to [submit an enquiry](/enquiry).\n"
         . "- For pricing, MOQ or exact lead time, direct them to [submit an enquiry](/enquiry).\n"
         . "- For greetings, thanks or small talk, reply briefly and warmly, then invite the next question.\n"
         . "- Do not use em dashes (the long dash). Write plainly with commas or periods.\n"
         . "- Tone: a knowledgeable technical sales rep. Reply with your final answer only.";
}

function httpPostJson($url, $headers, $payload, $timeout = 30) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    return ["body" => $body, "code" => $code, "err" => $err];
}

// ─── Google Gemini (recommended free tier) ─────────────────────
function callGemini($apiKey, $model, $system, $messages) {
    $model = $model !== "" ? $model : "gemini-2.0-flash";
    $url = "https://generativelanguage.googleapis.com/v1beta/models/"
         . rawurlencode($model) . ":generateContent?key=" . urlencode($apiKey);

    $contents = [];
    foreach ($messages as $m) {
        $role = ($m["role"] === "assistant") ? "model" : "user";
        $contents[] = ["role" => $role, "parts" => [["text" => $m["content"]]]];
    }

    // gemini-flash-latest resolves to a 2.5 "thinking" model whose reasoning is
    // counted in the output budget (often ~600-700 tokens). The budget must be
    // generous or the visible answer is starved and truncated. thinkingConfig is
    // not accepted by this model via v1beta, so we give room instead of disabling.
    $payload = [
        "system_instruction" => ["parts" => [["text" => $system]]],
        "contents"           => $contents,
        "generationConfig"   => ["maxOutputTokens" => 2048, "temperature" => 0.4],
    ];

    $res = httpPostJson($url, ["content-type: application/json"], $payload);
    if ($res["err"] || $res["code"] < 200 || $res["code"] >= 300) {
        error_log("Advisor[gemini] {$res['code']} {$res['err']} {$res['body']}");
        return null;
    }
    $body = json_decode($res["body"], true);
    if (!is_array($body) || isset($body["promptFeedback"]["blockReason"])) return null;

    $text = "";
    foreach ($body["candidates"][0]["content"]["parts"] ?? [] as $part) {
        if (!empty($part["thought"])) continue; // skip reasoning parts, keep the answer
        $text .= $part["text"] ?? "";
    }
    $text = trim($text);
    return $text !== "" ? $text : null;
}

// ─── Anthropic Claude ──────────────────────────────────────────
function callAnthropic($apiKey, $model, $system, $messages) {
    $model = $model !== "" ? $model : "claude-haiku-4-5";
    $payload = [
        "model"      => $model,
        "max_tokens" => 1024,
        "system"     => $system,
        "messages"   => $messages, // already role: user|assistant, content string
    ];
    $res = httpPostJson("https://api.anthropic.com/v1/messages", [
        "content-type: application/json",
        "x-api-key: " . $apiKey,
        "anthropic-version: 2023-06-01",
    ], $payload);
    if ($res["err"] || $res["code"] < 200 || $res["code"] >= 300) {
        error_log("Advisor[anthropic] {$res['code']} {$res['err']} {$res['body']}");
        return null;
    }
    $body = json_decode($res["body"], true);
    if (!is_array($body) || ($body["stop_reason"] ?? "") === "refusal") return null;

    $text = "";
    foreach ($body["content"] ?? [] as $block) {
        if (($block["type"] ?? "") === "text") $text .= $block["text"];
    }
    $text = trim($text);
    return $text !== "" ? $text : null;
}

// ─── OpenAI-compatible (OpenAI, Groq, OpenRouter, …) ───────────
function callOpenAI($apiKey, $model, $baseUrl, $system, $messages) {
    $model   = $model   !== "" ? $model   : "gpt-4o-mini";
    $baseUrl = rtrim($baseUrl !== "" ? $baseUrl : "https://api.openai.com/v1", "/");

    $msgs = [["role" => "system", "content" => $system]];
    foreach ($messages as $m) {
        $msgs[] = [
            "role"    => ($m["role"] === "assistant") ? "assistant" : "user",
            "content" => $m["content"],
        ];
    }

    $payload = ["model" => $model, "messages" => $msgs, "max_tokens" => 800, "temperature" => 0.4];
    $res = httpPostJson($baseUrl . "/chat/completions", [
        "content-type: application/json",
        "authorization: Bearer " . $apiKey,
    ], $payload);
    if ($res["err"] || $res["code"] < 200 || $res["code"] >= 300) {
        error_log("Advisor[openai] {$res['code']} {$res['err']} {$res['body']}");
        return null;
    }
    $body = json_decode($res["body"], true);
    $text = trim($body["choices"][0]["message"]["content"] ?? "");
    return $text !== "" ? $text : null;
}

// ─── Free fallback: rule-based catalogue matcher ───────────────
function smallTalkReply($q) {
    $q = trim($q);
    if (preg_match('/\b(thank|thanks|thx|cheers|appreciate)\b/', $q)) {
        return "You're welcome. Describe another job and I'll match it, or [submit an enquiry](/enquiry) when you're ready.";
    }
    if (preg_match('/^(ok|okay|kk|oh okay|i see|noted|cool|great|nice|got it|alright|sure|fine|perfect|ya|yeah|yep)\b/', $q)) {
        return "Glad that helps. Want a recommendation for another surface or condition? Just describe the job, or [submit an enquiry](/enquiry) to reach our sales team.";
    }
    if (preg_match('/\b(bye|goodbye|see ya|cya|good night)\b/', $q)) {
        return "Thanks for visiting Yee Lim. [Submit an enquiry](/enquiry) any time and our team will follow up.";
    }
    if (preg_match('/^(hi|hello|hey|yo|hiya|good (morning|afternoon|evening))\b/', $q)) {
        return "Hello! Tell me what you're bonding and the conditions (for example: foam to metal, in a humid area) and I'll match it to our range.";
    }
    if (preg_match('/\b(what can you do|who are you|how does this work|how do you work)\b/', $q)) {
        return "I'm Yee Lim's product advisor. Describe your bonding job (the surfaces and the environment) and I'll recommend adhesives from our range. For pricing or lead time, [submit an enquiry](/enquiry).";
    }
    return null;
}

// Company-fact answers for the free fallback path (LLM off or unavailable).
// Mirrors the Company Knowledge in the system prompt so basic questions still
// work without a model. English only; the LLM path handles other languages.
function companyFactReply($q) {
    $enq = "[submit an enquiry](/enquiry)";
    if (preg_match('/\b(address|located|location|directions?)\b/', $q)
        || preg_match('/where.*(you|located|shop|office|factory|find|based)/', $q)) {
        return "Yee Lim Adhesives Industries is at 1 Ang Mo Kio Street 65, #03-17, Singapore 569063. "
             . "Phone +65 8875 5786, WhatsApp 6588755786, email contact@yeelimadhesives.com.sg. See our [contact page](/contact).";
    }
    if (preg_match('/\b(contact|phone|call|email|whatsapp|reach)\b/', $q)) {
        return "You can reach us on +65 8875 5786, WhatsApp 6588755786, or email contact@yeelimadhesives.com.sg. "
             . "You can also $enq and our team will follow up.";
    }
    if (preg_match('/\b(export|overseas|international)\b/', $q) || preg_match('/outside singapore|other countr/', $q)) {
        return "Some of our products are exported overseas, and export can be arranged. Tell us your country in an $enq and we will advise.";
    }
    if (preg_match('/\b(deliver|delivery|shipping|ship|courier|postage)\b/', $q)) {
        return "We offer delivery for orders above a minimum quantity; smaller orders can be delivered for a small fee, "
             . "or you can collect from our office. For a delivery quote, $enq.";
    }
    if (preg_match('/\b(lead time|turnaround|in stock|ready stock)\b/', $q)
        || preg_match('/how long|when.*(deliver|ready|arrive)/', $q)) {
        return "Smaller quantities are usually ready stock; larger orders typically need about 3 to 5 days from order to delivery. "
             . "For exact timing on your order, $enq.";
    }
    if (preg_match('/\b(custom|special|formulat|bespoke)\b/', $q) || preg_match('/not listed|can'."'".'?t find|cannot find|made to order/', $q)) {
        return "If the adhesive you need is not in our catalogue, we can specially formulate one for your job. "
             . "Describe your requirement in an $enq and our team will help.";
    }
    if (preg_match('/\b(about|company|history|established|experience)\b/', $q) || preg_match('/who (are|is) (you|yee lim)|how (old|long)|how many years/', $q)) {
        return "Yee Lim Adhesives Industries is a Singapore adhesives and glue manufacturer with over 50 years of experience, "
             . "one of the biggest and earliest in Singapore. We started as a shoe factory and grew into a full adhesives manufacturer "
             . "serving construction, furniture, marine, leather and craft and more, plus OEM services.";
    }
    if (preg_match('/\b(green label|eco|environment|voc|certif)\b/', $q)) {
        return "Some products carry the Singapore Green Label (low VOC, eco friendly), for example Premier Brand G100. "
             . "Ask me for an eco-friendly option and I will suggest one.";
    }
    if (preg_match('/\b(price|pricing|cost|quote|quotation|moq)\b/', $q) || preg_match('/minimum order|how much/', $q)) {
        return "Pricing and minimum order quantities depend on the product and volume, so please $enq and our team will quote you.";
    }
    if (preg_match('/how (to|do i) (buy|order|purchase)|where.*buy/', $q)) {
        return "Add the products you want to your enquiry from the [catalogue](/products) and $enq, or contact us on "
             . "+65 8875 5786 / WhatsApp 6588755786. Our team will confirm availability, price and delivery.";
    }
    return null;
}

function ruleBasedReply($query, $products) {
    $q = strtolower($query);
    if (trim($q) === "") {
        return "Tell me what you're bonding and the conditions (for example: foam to metal, "
             . "in a humid area) and I'll match it to our range. For pricing, [submit an enquiry](/enquiry).";
    }

    $small = smallTalkReply($q);
    if ($small !== null) return $small;

    $fact = companyFactReply($q);
    if ($fact !== null) return $fact;

    $syn = [
        "wood"      => ["wood", "timber", "veneer", "laminate", "furniture", "carpentry", "cabinet", "plywood", "mdf"],
        "foam"      => ["foam", "sponge", "cushion", "upholstery", "mattress", "seat"],
        "metal"     => ["metal", "steel", "aluminium", "aluminum"],
        "tile"      => ["tile", "ceramic", "stone", "grout"],
        "rubber"    => ["rubber"],
        "leather"   => ["leather"],
        "carpet"    => ["carpet", "turf"],
        "floor"     => ["floor", "flooring", "subfloor"],
        "paper"     => ["paper", "label", "packaging", "box", "carton"],
        "wallpaper" => ["wallpaper"],
    ];

    $wet    = preg_match('/wet|water|bathroom|kitchen|pool|humid|moist|shower|damp/', $q);
    $marine = preg_match('/marine|boat|saltwater|sea|outdoor|waterline|yacht/', $q);
    $heat   = preg_match('/heat|hot|high.?temp|engine|exhaust|insulat|cooling|hvac/', $q);

    $scored = [];
    foreach ($products as $p) {
        $ind  = decodeList($p["industries"] ?? "[]");
        $surf = decodeList($p["surfaces"] ?? "[]");
        $hay  = strtolower(
            $p["name"] . " " . $p["short_description"] . " " .
            implode(" ", $ind) . " " . implode(" ", $surf) . " " . $p["category"]
        );

        $s = 0;
        foreach (preg_split('/[^a-z]+/', $q) as $t) {
            if (strlen($t) > 3 && strpos($hay, $t) !== false) $s += 2;
        }
        foreach ($syn as $words) {
            $inQ = false; $inH = false;
            foreach ($words as $w) {
                if (strpos($q, $w)   !== false) $inQ = true;
                if (strpos($hay, $w) !== false) $inH = true;
            }
            if ($inQ && $inH) $s += 3;
        }
        if ($wet    && preg_match('/waterproof|tile|plumbing/', $hay))       $s += 4;
        if ($marine && strpos($hay, 'marine') !== false)                     $s += 5;
        if ($heat   && preg_match('/temperature|insulation|cooling/', $hay)) $s += 4;

        if ($s > 0) $scored[] = ["p" => $p, "s" => $s];
    }

    usort($scored, function ($a, $b) { return $b["s"] - $a["s"]; });
    $top = array_slice($scored, 0, 3);

    if (empty($top)) {
        return "I couldn't find a confident match for that. Could you tell me the two surfaces "
             . "you're bonding and whether there's water or heat exposure? Or "
             . "[submit an enquiry](/enquiry) and our team will advise.";
    }

    $bullets = [];
    foreach ($top as $x) {
        $p = $x["p"];
        // Never present an unavailable product as if it's in stock.
        $avail = (($p["status"] ?? "Available") !== "Available")
            ? " (currently unavailable, ask us about availability)"
            : "";
        $bullets[] = "- **{$p['name']}**: {$p['short_description']}{$avail} ([details](/product-detail?id={$p['id']}))";
    }
    return "Based on that, here's what I'd recommend:\n\n" . implode("\n", $bullets)
         . "\n\nFor pricing, MOQ and lead time, [submit an enquiry](/enquiry).";
}
?>
