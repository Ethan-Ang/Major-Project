<?php
/**
 * Test-only front controller for PHP's built-in server, so browser QA runs
 * against the same URL shapes production serves.
 *
 * Mirrors frontend/.htaccess:
 *   4a. /index.html            -> 301 /
 *       /{page}.html (six)     -> 301 /{page}
 *   4b. /{path} with no real file -> serve {path}.html, URL unchanged
 *   3b. otherwise                 -> 404 carrying 404.html
 *
 * Run with:  php -S 127.0.0.1:PORT -t frontend tests/helpers/router.php
 *
 * Returning false hands the request back to the built-in server, which serves
 * real static files and executes real .php endpoints -- so /api/advisor.php is
 * the genuine endpoint, not a stub.
 */

$root = rtrim(str_replace("\\", "/", getcwd()), "/");
$uri = (string) parse_url($_SERVER["REQUEST_URI"] ?? "/", PHP_URL_PATH);
$uri = rawurldecode($uri);

/** Keeps a crafted path from escaping the document root. */
$resolve = static function (string $path) use ($root): ?string {
    $candidate = $root . "/" . ltrim($path, "/");
    $real = realpath($candidate);
    if ($real === false) {
        return null;
    }
    $real = str_replace("\\", "/", $real);
    return str_starts_with($real, $root . "/") || $real === $root ? $real : null;
};

$cleanUrlPages = ["products", "about", "contact", "enquiry", "compare", "product-detail"];

// 4a. Canonical clean URLs.
if ($uri === "/index.html") {
    header("Location: /", true, 301);
    exit;
}
if (preg_match('#^/([A-Za-z0-9-]+)\.html$#', $uri, $matches) === 1
    && in_array($matches[1], $cleanUrlPages, true)) {
    header("Location: /" . $matches[1], true, 301);
    exit;
}

// Real files and directories (including every .php endpoint) are served by the
// built-in server exactly as the live host would.
$target = $resolve($uri);
if ($target !== null && is_file($target)) {
    return false;
}
if ($uri === "/" || ($target !== null && is_dir($target))) {
    return false;
}

// 4b. Extensionless route -> its .html file, with the address bar unchanged.
$withoutTrailingSlash = rtrim($uri, "/");
if ($withoutTrailingSlash !== "") {
    $html = $resolve($withoutTrailingSlash . ".html");
    if ($html !== null && is_file($html)) {
        header("Content-Type: text/html; charset=utf-8");
        header("Cache-Control: no-cache, no-store, must-revalidate");
        readfile($html);
        exit;
    }
}

// 3b. ErrorDocument 404 /404.html
$notFound = $resolve("/404.html");
http_response_code(404);
header("Content-Type: text/html; charset=utf-8");
if ($notFound !== null && is_file($notFound)) {
    readfile($notFound);
} else {
    echo "Not found";
}
exit;
