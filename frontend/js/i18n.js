/* ─── Lightweight i18n engine (EN / Simplified Chinese) ───────────────
   Static-site friendly: no build step, no framework. Elements opt in with
   data-i18n="key" (textContent) or data-i18n-attr="attr:key,attr2:key2".
   The chosen language is stored in localStorage ("ylLang") and applied on
   load; switching reloads the page so every script re-renders in-language.

   NOTE: the Simplified-Chinese strings below are first-pass drafts and should
   be reviewed by a native speaker before going fully live.
   ──────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var DICT = {
    // ── Navigation (shared navbar) ──
    "nav.home":            { en: "Home",            zh: "首页" },
    "nav.products":        { en: "Products",        zh: "产品" },
    "nav.about":           { en: "About",           zh: "关于我们" },
    "nav.contact":         { en: "Contact",         zh: "联系我们" },
    "nav.enquiry":         { en: "Product Enquiry", zh: "产品询价" },
    "nav.enquiry_short":   { en: "Enquiry",         zh: "询价" },

    // ── Common actions / labels ──
    "common.add_enquiry":  { en: "Add to Enquiry",  zh: "加入询价" },
    "common.in_enquiry":   { en: "In Enquiry",      zh: "已加入询价" },
    "common.compare":      { en: "Compare",         zh: "对比" },
    "common.skip":         { en: "Skip to main content", zh: "跳转到主要内容" },
    "common.in_compare":   { en: "In Comparison",   zh: "已加入对比" },
    "common.talk":         { en: "Talk to Yee Lim", zh: "联系 Yee Lim" },
    "common.available":    { en: "Available",       zh: "有货" },
    "common.view_all":     { en: "View all products", zh: "查看所有产品" },
    "common.view_details": { en: "View details",    zh: "查看详情" },
    "common.related":      { en: "Related Products", zh: "相关产品" },
    "common.best_for":     { en: "Best for",        zh: "适用于" },
    "common.works_on":     { en: "Works on",        zh: "适用材料" },
    "common.add_product":  { en: "Add a product",   zh: "添加产品" },
    "common.search_browse":{ en: "Search or browse", zh: "搜索或浏览" },
    "common.cmp_hint_min": { en: "Select at least 2 products to compare", zh: "请至少选择 2 款产品进行对比" },
    "common.cmp_hint_open":{ en: "Open comparison view", zh: "打开对比视图" },
    "common.added_enquiry":  { en: "was added to your product enquiry.", zh: "已加入您的产品询价。" },
    "common.removed_enquiry":{ en: "was removed from your product enquiry.", zh: "已从您的产品询价中移除。" },
    "common.back_products":  { en: "Back to Products",  zh: "返回产品列表" },

    // ── Compare: screen-reader-only announcements and labels ──
    //    A11Y-007: these are invisible to sighted users, which is exactly why
    //    they were the last strings left in English — nothing on screen showed
    //    the gap. A Chinese screen-reader user was hearing English.
    "cmp.a11y.added":      { en: "added to compare.",   zh: "已加入对比。" },
    "cmp.a11y.removed":    { en: "removed from compare.", zh: "已从对比中移除。" },
    "cmp.a11y.cleared":    { en: "Comparison cleared.", zh: "对比已清空。" },
    "cmp.a11y.full":       { en: "Compare is full ({max} products). Remove one to add another.", zh: "对比列表已满（{max} 款产品）。请先移除一款再添加。" },
    "cmp.a11y.none":       { en: "Compare products; no products selected", zh: "产品对比；尚未选择产品" },
    "cmp.a11y.expand":     { en: "Expand comparison tray, {count} selected", zh: "展开对比栏，已选 {count} 款" },
    "cmp.a11y.collapse":   { en: "Collapse comparison tray, {count} selected", zh: "收起对比栏，已选 {count} 款" },
    "cmp.a11y.collapse_short": { en: "Collapse compare", zh: "收起对比" },
    "cmp.a11y.sheet":      { en: "Selected products to compare", zh: "已选择的对比产品" },
    "cmp.a11y.remove_one": { en: "Remove {product} from comparison", zh: "将 {product} 从对比中移除" },
    "cmp.a11y.clear_all":  { en: "Clear all products from comparison", zh: "清除对比中的所有产品" },

    // ── Footer (shared) ──
    "footer.blurb":        { en: "One of Singapore's earliest and largest adhesive manufacturers. For over 50 years we have formulated commercial and industrial adhesive solutions engineered to the job, not off the shelf.", zh: "新加坡历史最悠久、规模最大的胶粘剂制造商之一。五十多年来，我们专注于研发针对具体工序定制的工商业胶粘剂解决方案，而非现成产品。" },
    "footer.cert_iso":     { en: "ISO Certified",   zh: "ISO 认证" },
    "footer.cert_green":   { en: "Singapore Green Label", zh: "新加坡绿色标签" },
    "footer.cert_lowvoc":  { en: "Low-VOC / Low-Formaldehyde", zh: "低 VOC / 低甲醛" },
    "footer.company":      { en: "Company",         zh: "公司" },
    "footer.about":        { en: "About Yee Lim",   zh: "关于 Yee Lim" },
    "footer.heritage":     { en: "Our Heritage",    zh: "企业历程" },
    "footer.quality":      { en: "Quality & Environment", zh: "品质与环保" },
    "footer.products_brands": { en: "Products & Brands", zh: "产品与品牌" },
    "footer.all_products": { en: "All Products",    zh: "所有产品" },
    "footer.contact_enquiry": { en: "Contact & Enquiry", zh: "联系与询价" },
    "footer.address":      { en: "Address",         zh: "地址" },
    "footer.email":        { en: "Email",           zh: "电子邮箱" },
    "footer.speak":        { en: "Speak to Yee Lim", zh: "联系 Yee Lim" },
    "footer.rights":       { en: "All rights reserved.", zh: "版权所有。" },
    "footer.tagline":      { en: "Commercial & Industrial Adhesive Solutions · Singapore", zh: "工商业胶粘剂解决方案 · 新加坡" },
    "footer.brands":       { en: "Brands",          zh: "品牌" },
    "footer.mobile_blurb": { en: "Commercial & industrial adhesives, manufactured in Singapore since 1976.", zh: "工商业胶粘剂，自 1976 年起于新加坡制造。" },
    "footer.project":      { en: "Have a project in mind?", zh: "有项目需求？" },
    "footer.project_sub":  { en: "Enquiries & quotations within 1-2 business days.", zh: "询价与报价将在 1-2 个工作日内回复。" },
    "footer.contact_us":   { en: "Contact us",      zh: "联系我们" },
    "footer.whatsapp_us":  { en: "WhatsApp us",     zh: "WhatsApp 联系我们" },
    "footer.whatsapp_aria":{ en: "Message Yee Lim on WhatsApp (opens WhatsApp)", zh: "通过 WhatsApp 联系 Yee Lim（将打开 WhatsApp）" },

    // ── Products / catalogue page ──
    "products.eyebrow":    { en: "Product Catalogue", zh: "产品目录" },
    "products.title":      { en: "Find the Right Bonding Solution", zh: "找到合适的粘合方案" },
    "products.lead":       { en: "Explore adhesives and application equipment by brand, industry, material, or intended use.", zh: "按品牌、行业、材料或用途浏览胶粘剂与施工设备。" },
    "products.filters":    { en: "Filters",         zh: "筛选" },
    "products.search_ph":  { en: "Search products…", zh: "按产品名称、编号、品牌或关键词搜索……" },
    "products.active_filters": { en: "Active filters", zh: "已选筛选" },
    "products.clear_all":  { en: "Clear all",       zh: "清除全部" },
    "products.f_product_type": { en: "Product Type", zh: "产品类型" },
    "products.f_brand":    { en: "Brand",           zh: "品牌" },
    "products.f_industry": { en: "Industry",        zh: "行业" },
    "products.f_surface":  { en: "Surface / Material", zh: "表面 / 材料" },
    "products.show_products": { en: "Show products", zh: "显示产品" },
    "products.show_more":  { en: "Show more",       zh: "显示更多" },
    "products.show_less":  { en: "Show less",       zh: "收起" },
    "products.sort_by":    { en: "Sort by",         zh: "排序方式" },
    "products.sort_default": { en: "Default order", zh: "默认排序" },
    "products.sort_az":    { en: "Name A–Z",        zh: "名称 A–Z" },
    "products.sort_za":    { en: "Name Z–A",        zh: "名称 Z–A" },
    "products.sort_brand": { en: "Sort by Brand",   zh: "按品牌排序" },
    "products.loading":    { en: "Loading products…", zh: "正在加载产品……" },
    "products.empty_title": { en: "No products match those filters", zh: "没有符合筛选条件的产品" },
    "products.empty_body": { en: "Try removing a filter or clearing your search, or describe your job to the Product Advisor.", zh: "请尝试移除某个筛选条件或清除搜索，或向产品顾问描述您的需求。" },
    "products.empty_clear": { en: "Clear all filters", zh: "清除所有筛选" },
    "products.empty_advisor": { en: "Ask the Product Advisor", zh: "询问产品顾问" },
    "products.count_word_one": { en: "product",     zh: "款产品" },
    "products.count_word_many": { en: "products",   zh: "款产品" },
    "products.of":         { en: "of",              zh: "／共" },


    // ── Bond Finder V3 ──
    "bond.eyebrow":        { en: "Guided Product Selector", zh: "引导式产品选择器" },
    "bond.title":          { en: "Yee Lim Bond Finder", zh: "Yee Lim 粘合方案查找器" },
    "bond.lead":           { en: "Choose two surfaces, then optionally refine by industry and application method. We will rank currently available adhesives using the latest catalogue data.", zh: "请选择两种表面材料，并可按行业和施工方法进一步筛选。系统将根据最新产品目录为目前有货的胶粘剂进行排序。" },
    "bond.surface_one":    { en: "First surface *", zh: "第一种表面 *" },
    "bond.surface_two":    { en: "Second surface *", zh: "第二种表面 *" },
    "bond.select_surface": { en: "Select a surface", zh: "请选择表面" },
    "bond.industry":       { en: "Industry", zh: "行业" },
    "bond.method":         { en: "Application method", zh: "施工方法" },
    "bond.no_preference":  { en: "No preference", zh: "不限" },
    "bond.find":           { en: "Find suitable adhesives", zh: "查找合适的胶粘剂" },
    "bond.disclaimer":     { en: "Catalogue matches are guidance only. Confirm final suitability, surface preparation and operating conditions with Yee Lim before purchase or large-scale use.", zh: "目录匹配结果仅供参考。购买或大规模使用前，请与 Yee Lim 确认最终适用性、表面处理及使用条件。" },
    "bond.whatsapp":       { en: "Confirm on WhatsApp", zh: "通过 WhatsApp 确认" },
    "bond.clear":          { en: "Clear recommendation", zh: "清除推荐" },

    // ── Contact page ──
    "contact.eyebrow":     { en: "Contact Us",      zh: "联系我们" },
    "contact.title":       { en: "We’re Here to Help", zh: "我们随时为您服务" },
    "contact.lead":        { en: "Get in touch with our team for product enquiries, technical advice, or partnership opportunities. We’ll get back to you promptly.", zh: "如需产品询价、技术咨询或合作洽谈，请与我们的团队联系，我们会尽快回复您。" },
    "contact.info":        { en: "Contact Information", zh: "联系方式" },
    "contact.send":        { en: "Send Us a Message", zh: "给我们留言" },
    /* Response time note, Business Operating Hours and Find Us. The markup for
       these shipped without translation keys, so 中文 rendered an English lower
       half. Drafts, like the rest of this file: needs a native review pass. */
    "contact.response_title":  { en: "Response time", zh: "回复时间" },
    "contact.response_body":   { en: "We usually respond within 1-2 business days. For urgent product enquiries, message our team directly on WhatsApp.", zh: "我们通常在 1-2 个工作日内回复。如有紧急产品需求，请直接通过 WhatsApp 联系我们的团队。" },
    "contact.visit_eyebrow":   { en: "Plan Your Visit",  zh: "到访须知" },
    "contact.hours_title":     { en: "Business Operating Hours", zh: "营业时间" },
    "contact.hours_intro":     { en: "Visit or contact our team during the operating hours below.", zh: "请在以下营业时间内到访或联系我们的团队。" },
    "contact.weekdays":        { en: "Monday-Friday",    zh: "周一至周五" },
    "contact.saturday":        { en: "Saturday",         zh: "周六" },
    "contact.sunday":          { en: "Sunday",           zh: "周日" },
    "contact.closed":          { en: "Closed",           zh: "休息" },
    "contact.public_holidays": { en: "Public holidays",  zh: "公共假期" },
    "contact.holiday_hours":   { en: "Hours may vary",   zh: "营业时间可能有所调整" },
    "contact.holiday_note":    { en: "Please contact us before visiting on a public holiday.", zh: "公共假期到访前，请先与我们联系确认。" },
    "contact.location_eyebrow":{ en: "Our Location",     zh: "我们的位置" },
    "contact.find_us":         { en: "Find Us",          zh: "查找我们" },
    "contact.map_address":     { en: "1 Ang Mo Kio Street 65, #03-17 JTC Space @ Ang Mo Kio, Singapore 569063", zh: "新加坡宏茂桥 65 街 1 号 #03-17，JTC Space @ Ang Mo Kio，邮编 569063" },
    "contact.directions":      { en: "Get Directions",   zh: "获取路线" },
    "contact.map_title":       { en: "Map showing Yee Lim Adhesives Industries at JTC Space @ Ang Mo Kio", zh: "显示 Yee Lim Adhesives Industries 位于 JTC Space @ Ang Mo Kio 的地图" },
    "contact.email_link":  { en: "contact us by email", zh: "通过电子邮件联系我们" },
    /* contact.reply_time is retired: it said "we reply within 1-2 business days"
       directly above the Response time note that says the same thing. The note
       keeps the claim (it also carries the WhatsApp escalation); the email row
       now describes what the channel is for, mirroring the WhatsApp row. */
    "contact.email_sub":   { en: "Best for detailed enquiries and documents.", zh: "适合详细询价与文件往来。" },
    "contact.phone_wa":    { en: "Phone / WhatsApp",   zh: "电话 / WhatsApp" },
    "contact.wa_sub":      { en: "Chat with our team on WhatsApp.", zh: "通过 WhatsApp 与我们的团队沟通。" },
    "contact.talk_wa":     { en: "Talk to Yee Lim on WhatsApp", zh: "通过 WhatsApp 联系 Yee Lim" },
    "contact.f_name":      { en: "Full Name *",        zh: "姓名 *" },
    "contact.f_company":   { en: "Company",            zh: "公司" },
    "contact.f_email":     { en: "Email Address *",    zh: "电子邮箱 *" },
    "contact.f_phone":     { en: "Phone Number",       zh: "电话号码" },
    "contact.f_subject":   { en: "Subject *",          zh: "主题 *" },
    "contact.f_message":   { en: "Message *",          zh: "留言 *" },
    "contact.ph_name":     { en: "Your name",          zh: "您的姓名" },
    "contact.ph_company":  { en: "Company name",       zh: "公司名称" },
    "contact.ph_subject":  { en: "Product enquiry / quotation request", zh: "产品询价 / 报价请求" },
    "contact.ph_message":  { en: "Tell us what product or adhesive application you need help with...", zh: "请告诉我们您需要哪种产品或胶粘应用方面的帮助……" },
    "contact.security_note": { en: "Your information is kept secure and will only be used to respond to your enquiry.", zh: "您的信息将被安全保存，仅用于回复您的询问。" },
    "contact.send_msg":    { en: "Send Message",       zh: "发送留言" },
    "contact.fill_required": { en: "Please fill in all required fields.", zh: "请填写所有必填项。" },
    "contact.sending":     { en: "Sending…",           zh: "提交中……" },
    "contact.sending_msg": { en: "Sending your message…", zh: "正在提交您的留言……" },
    "contact.thanks":      { en: "Thank you. We've received your enquiry.", zh: "感谢您。我们已收到您的询问。" },
    "contact.reply2":      { en: "Our team will reply within 1-2 business days.", zh: "我们的团队将在 1-2 个工作日内回复。" },
    "contact.ref_is":      { en: "Your reference is", zh: "您的参考编号为" },
    "contact.fail_auto":   { en: "We could not submit your message automatically. Your email app should have opened so you can send it directly.", zh: "我们无法自动提交您的留言。您的邮件应用应已打开，您可直接发送。" },
    "contact.fail_email_at": { en: "If it did not, email us at", zh: "如未打开，请发送邮件至" },

    // ── Product detail page ──
    "detail.tab_specs":    { en: "Specifications",     zh: "产品规格" },
    "detail.tab_apply":    { en: "Application & Suitable Uses", zh: "应用与适用范围" },
    "detail.tab_downloads":{ en: "Downloads",          zh: "下载" },
    "detail.add3":         { en: "Add up to 3 products", zh: "最多可添加 3 款产品" },
    "detail.compare_now":  { en: "Compare now",        zh: "立即对比" },
    "detail.avail_note":   { en: "Pricing & lead time confirmed on enquiry", zh: "价格与交期以询价为准" },
    "detail.unavailable":  { en: "Unavailable",        zh: "暂无现货" },
    "detail.how_to_use":   { en: "How to Use",         zh: "使用方法" },
    "detail.suitable_uses":{ en: "Suitable Uses",      zh: "适用范围" },
    "detail.key_benefits": { en: "Key Benefits",       zh: "主要优势" },
    "detail.enquire":      { en: "Enquire",            zh: "询价" },
    "detail.not_found":    { en: "Product not found.", zh: "未找到该产品。" },
    "detail.back_products":{ en: "Back to products",   zh: "返回产品列表" },
    "detail.contact_yl":   { en: "Contact Yee Lim",    zh: "联系 Yee Lim" },
    "detail.spec_empty":   { en: "Specifications for this product are available from our team.", zh: "本产品的规格可向我们的团队索取。" },
    "detail.tech_info":    { en: "for detailed technical information.", zh: "以获取详细技术信息。" },
    "detail.apply_empty":  { en: "Application guidance for this product is available from our team.", zh: "本产品的应用指导可向我们的团队索取。" },
    "detail.surface_advice": { en: "for advice on your surface and application.", zh: "以获取针对您的表面与应用的建议。" },
    "detail.no_downloads": { en: "No downloads are currently available for this product.", zh: "本产品暂无可下载的文件。" },
    "detail.no_downloads_sub": { en: "Contact Yee Lim for technical documentation.", zh: "如需技术文档，请联系 Yee Lim。" },
    "detail.guidance_title": { en: "Need help confirming compatibility?", zh: "需要帮助确认适用性？" },
    "detail.guidance_body":{ en: "Share your materials, application and quantity requirements. Our team will help confirm the most suitable option.", zh: "请告诉我们您的材料、应用与数量需求，我们的团队将帮助您确认最合适的选择。" },
    "detail.gate_doc":     { en: "Document",           zh: "文件" },
    "detail.gate_title":   { en: "Download the document", zh: "下载文件" },
    "detail.gate_notice":  { en: "We collect your name, work email, company and optional contact number to record and manage your request for this document, and to contact you about it where necessary. Your details are accessible only to authorised Yee Lim staff and are not used for marketing without your consent.", zh: "我们收集您的姓名、工作邮箱、公司及可选的联系电话，用于记录和管理您对本文件的索取请求，并在必要时就此与您联系。您的信息仅限授权的 Yee Lim 员工访问，未经您同意不会用于营销。" },
    "detail.gate_name":    { en: "Name *",             zh: "姓名 *" },
    "detail.gate_email":   { en: "Work email *",       zh: "工作邮箱 *" },
    "detail.gate_company": { en: "Company *",          zh: "公司 *" },
    "detail.gate_phone":   { en: "Contact number",     zh: "联系电话" },
    "detail.gate_submit":  { en: "Get the document",   zh: "获取文件" },
    "detail.gate_close":   { en: "Close",              zh: "关闭" },
    "detail.gate_starting":{ en: "Your download is starting", zh: "您的下载即将开始" },
    "detail.gate_manual_pre": { en: "If it doesn't begin automatically,", zh: "如果没有自动开始，" },
    "detail.gate_manual_link": { en: "click here to download", zh: "请点击此处下载" },
    "detail.gate_done":    { en: "Done",               zh: "完成" },

    // ── Spec table row labels ──
    "spec.brand":          { en: "Brand",              zh: "品牌" },
    "spec.product_type":   { en: "Product Type",       zh: "产品类型" },
    "spec.industries":     { en: "Industries",         zh: "适用行业" },
    "spec.surfaces":       { en: "Surfaces / Materials", zh: "适用表面 / 材料" },
    "spec.app_method":     { en: "Application Method", zh: "施工方法" },
    "spec.sizes":          { en: "Available Sizes",    zh: "包装规格" },
    "spec.characteristics":{ en: "Characteristics",    zh: "产品特性" },

    // ── Compare page ──
    "compare.title":       { en: "Compare Products",   zh: "产品对比" },
    "compare.lead":        { en: "Side-by-side comparison to help you find the right bonding solution.", zh: "并排对比，帮助您找到合适的粘合方案。" },
    "compare.category":    { en: "Category",           zh: "产品类别" },
    "compare.key_features":{ en: "Key Features",       zh: "主要特性" },

    // ── Enquiry page ──
    "enquiry.title":       { en: "Product Enquiry",    zh: "产品询价" },
    "enquiry.lead":        { en: "Review your selected products and submit an enquiry. Our team will respond with expert advice and recommendations.", zh: "查看您选择的产品并提交询价，我们的团队将为您提供专业建议与推荐。" },
    "enquiry.basket":      { en: "Your Enquiry Basket", zh: "您的询价清单" },
    "enquiry.basket_sub":  { en: "Review the products you've selected.", zh: "查看您已选择的产品。" },
    "enquiry.clear_all":   { en: "Clear all",          zh: "清除全部" },
    "enquiry.total":       { en: "Total Products",     zh: "产品总数" },
    "enquiry.need_help":   { en: "Need help finding the right product?", zh: "需要帮助挑选合适的产品？" },
    "enquiry.get_advice":  { en: "Get Product Advice", zh: "获取产品建议" },
    "enquiry.your_details":{ en: "Your Details",       zh: "您的信息" },
    "enquiry.required":    { en: "* Required fields",  zh: "* 必填项" },
    "enquiry.details_sub": { en: "Please provide your details so our team can respond accurately.", zh: "请填写您的信息，以便我们的团队准确回复。" },
    "enquiry.f_name":      { en: "Full Name *",        zh: "姓名 *" },
    "enquiry.f_company":   { en: "Company Name *",     zh: "公司名称 *" },
    "enquiry.f_email":     { en: "Email Address *",    zh: "电子邮箱 *" },
    "enquiry.f_phone":     { en: "Phone Number",       zh: "电话号码" },
    "enquiry.f_subject":   { en: "Subject",            zh: "主题" },
    "enquiry.f_message":   { en: "Message",            zh: "留言" },
    "enquiry.f_notes":     { en: "Enquiry Notes",      zh: "询价备注" },
    "enquiry.optional":    { en: "(Optional)",         zh: "（选填）" },
    "enquiry.ph_name":     { en: "John Tan",           zh: "您的姓名" },
    "enquiry.ph_company":  { en: "ABC Pte Ltd",        zh: "贵公司名称" },
    "enquiry.ph_message":  { en: "Tell us the surfaces you are bonding, your application, and the quantity you need…", zh: "请告诉我们您要粘合的表面、应用场景以及所需数量……" },
    "enquiry.ph_notes":    { en: "Any additional information that may help our team…", zh: "任何有助于我们团队的补充信息……" },
    "enquiry.opt_select":  { en: "Select enquiry subject", zh: "请选择询价主题" },
    "enquiry.opt_general": { en: "General product enquiry", zh: "一般产品询价" },
    "enquiry.opt_quote":   { en: "Request a quotation", zh: "申请报价" },
    "enquiry.opt_tech":    { en: "Technical / application advice", zh: "技术 / 应用咨询" },
    "enquiry.opt_bulk":    { en: "Bulk or distributor enquiry", zh: "批量或经销商询价" },
    "enquiry.opt_other":   { en: "Other",              zh: "其他" },
    "enquiry.err_name":    { en: "Please enter your full name.", zh: "请输入您的姓名。" },
    "enquiry.err_company": { en: "Please enter your company name.", zh: "请输入您的公司名称。" },
    "enquiry.err_email":   { en: "Please enter a valid email address.", zh: "请输入有效的电子邮箱地址。" },
    "enquiry.err_privacy": { en: "Please agree to the use of your information so we can process your enquiry.", zh: "请同意我们使用您的信息以处理您的询价。" },
    "enquiry.privacy_agree": { en: "I agree to the collection and use of my information to process this enquiry.", zh: "我同意收集并使用我的信息以处理本次询价。" },
    "enquiry.submit":      { en: "Submit Enquiry",     zh: "提交询价" },
    "enquiry.sending":     { en: "Sending…",           zh: "提交中……" },
    "enquiry.reassurance": { en: "We'll reply within 1-2 business days with advice or a quotation.", zh: "我们将在 1-2 个工作日内回复建议或报价。" },
    "enquiry.security":    { en: "Your information is secure and will only be used to process your enquiry.", zh: "您的信息将被安全保存，仅用于处理您的询价。" },
    "enquiry.empty_title": { en: "No products selected yet", zh: "尚未选择任何产品" },
    "enquiry.empty_body":  { en: "Browse the catalogue and add adhesives to build a single enquiry for our team.", zh: "浏览产品目录并添加胶粘剂，即可为我们的团队创建一份询价。" },
    "enquiry.browse":      { en: "Browse Products",    zh: "浏览产品" },
    "enquiry.browse_more": { en: "Browse More Products", zh: "浏览更多产品" },
    "enquiry.remove":      { en: "Remove",             zh: "移除" },
    "enquiry.item":        { en: "item",               zh: "件" },
    "enquiry.items":       { en: "items",              zh: "件" },
    "enquiry.your_ref":    { en: "Your reference:",    zh: "您的参考编号：" },
    "enquiry.sent_body":   { en: "Thank you for your enquiry. Our team will get back to you within 1-2 business days.", zh: "感谢您的询价。我们的团队将在 1-2 个工作日内与您联系。" },
    "enquiry.sent_email":  { en: "We've emailed a copy to you for your records.", zh: "我们已将副本发送至您的邮箱以供存档。" },
    "enquiry.send_fail":   { en: "We could not send your enquiry right now. Please try again shortly, or contact Yee Lim directly via the Contact page.", zh: "我们暂时无法提交您的询价。请稍后重试，或通过“联系我们”页面直接联系 Yee Lim。" },
    "enquiry.send_wrong":  { en: "Something went wrong. Please try again.", zh: "出现问题，请重试。" },
    "enquiry.update_fail": { en: "Sorry, we couldn't update your enquiry. Please try again.", zh: "抱歉，我们无法更新您的询价，请重试。" },
    "enquiry.fill_prefix": { en: "Please enter your ", zh: "请在提交询价前填写：" },
    "enquiry.fill_suffix": { en: " before sending your enquiry.", zh: "。" },
    "enquiry.fld_name":    { en: "full name",          zh: "姓名" },
    "enquiry.fld_company": { en: "company name",       zh: "公司名称" },
    "enquiry.fld_email":   { en: "email address",      zh: "电子邮箱" },
    "enquiry.fld_email_valid": { en: "valid email address", zh: "有效的电子邮箱" },
    "enquiry.sent":        { en: "Enquiry Sent",       zh: "询价已提交" },

    // ── Product Advisor (Ava chatbot) ──
    "advisor.subtitle":    { en: "Yee Lim Product Advisor", zh: "Yee Lim 产品顾问" },
    "advisor.aria_close":  { en: "Close product advisor", zh: "关闭产品顾问" },
    "advisor.aria_input":  { en: "Ask the product advisor a question", zh: "向产品顾问提问" },
    "advisor.placeholder": { en: "Message…",           zh: "输入消息……" },
    "advisor.aria_send":   { en: "Send message",       zh: "发送消息" },
    "advisor.note":        { en: "Guidance only. Our team confirms suitability.", zh: "仅供参考，具体适用性以我们团队确认为准。" },
    "advisor.greeting":    { en: "Hi, I'm Ava, your Yee Lim product advisor. Tell me what you're bonding and the conditions, and I'll suggest the right adhesive.", zh: "您好，我是 Ava，您的 Yee Lim 产品顾问。请告诉我您要粘合的材料以及使用环境，我会为您推荐合适的胶粘剂。" },
    "advisor.fallback":    { en: "I couldn't find an answer for that. Please [submit an enquiry](/enquiry) and our team will help.", zh: "我暂时无法为此找到答案。请[提交询价](/enquiry)，我们的团队将为您提供帮助。" },
    "advisor.error":       { en: "Sorry, I can't connect right now. Please [submit an enquiry](/enquiry) directly.", zh: "抱歉，我暂时无法连接。请直接[提交询价](/enquiry)。" },

    /* ── Home (teammate-owned page) ────────────────────────────────
       The `en` values are the teammate's approved copy, transcribed
       character-for-character from the live page — they are the fallback the
       engine returns in English, so any drift here would silently rewrite
       their page. Do not "improve" this wording.
       Statistics (40+, 500+, 1000+, SG) and brand names stay as digits/Latin
       in both languages and carry no key. The zh values are DRAFTS pending
       native review (see the same caveat on the rest of the dictionary). */
    "home.tagline":        { en: "Industrial Adhesive Solutions", zh: "工业胶粘解决方案" },
    "home.title":          { en: "Trusted Adhesives for Every Industry", zh: "值得信赖的胶粘剂，服务各行各业" },
    "home.lead":           { en: "Supplying quality adhesives for woodworking, packaging, construction, furniture, and industrial applications.", zh: "为木工、包装、建筑、家具及工业应用提供优质胶粘剂。" },
    "home.browse":         { en: "Browse Products",   zh: "浏览产品" },
    "home.contact_sales":  { en: "Contact Sales",     zh: "联系销售" },
    "home.stat_years":     { en: "Years Experience",  zh: "年经验" },
    "home.stat_products":  { en: "Products",          zh: "产品" },
    "home.stat_customers": { en: "Customers Served",  zh: "服务客户" },
    "home.stat_local":     { en: "Local Supplier",    zh: "本地供应商" },
    "home.cats_title":     { en: "Our Product Categories", zh: "产品类别" },
    "home.cats_lead":      { en: "Find the right adhesive for your business needs.", zh: "找到适合您业务需求的胶粘剂。" },
    "home.cat_plastics":   { en: "Plastics & Acrylics", zh: "塑料与亚克力" },
    "home.cat_plastics_d": { en: "Adhesives for furniture, plywood, and timber applications.", zh: "适用于家具、胶合板及木材应用的胶粘剂。" },
    "home.cat_laminates":  { en: "Laminates",         zh: "层压板" },
    "home.cat_laminates_d":{ en: "Reliable bonding solutions for cartons, paper, and packaging lines.", zh: "适用于纸箱、纸张及包装生产线的可靠粘接方案。" },
    "home.cat_flooring":   { en: "Flooring",          zh: "地板" },
    "home.cat_flooring_d": { en: "Reliable bonding solutions for cartons, paper, and packaging lines.", zh: "适用于纸箱、纸张及包装生产线的可靠粘接方案。" },
    "home.cat_packaging":  { en: "Laminates",         zh: "层压板" },
    "home.cat_packaging_d":{ en: "High-performance adhesives for manufacturing operations.", zh: "适用于生产制造作业的高性能胶粘剂。" },
    "home.why_title":      { en: "Why Choose Yee Lim?", zh: "为什么选择 Yee Lim？" },
    "home.why_lead":       { en: "With decades of experience, Yee Lim provides dependable adhesive solutions backed by technical knowledge and consistent product quality.", zh: "凭借数十年经验，Yee Lim 以专业技术知识和稳定的产品品质，提供可靠的胶粘解决方案。" },
    "home.why_1":          { en: "✔ Consistent adhesive quality", zh: "✔ 稳定的胶粘品质" },
    "home.why_2":          { en: "✔ Technical support",  zh: "✔ 技术支持" },
    "home.why_3":          { en: "✔ Wide product range", zh: "✔ 丰富的产品系列" },
    "home.why_4":          { en: "✔ Custom solutions",   zh: "✔ 定制解决方案" },
    "home.why_5":          { en: "✔ Fast local delivery", zh: "✔ 本地快速配送" },
    "home.why_6":          { en: "✔ Trusted by businesses", zh: "✔ 深受企业信赖" },
    "home.brands_title":   { en: "Our Brands",         zh: "我们的品牌" },
    "home.brands_lead":    { en: "Click a brand to see its products", zh: "点击品牌查看其产品" },
    "home.cta_title":      { en: "Looking for the Right Adhesive Solution?", zh: "正在寻找合适的胶粘解决方案？" },
    "home.cta_lead":       { en: "Speak to our team and get product recommendations for your business.", zh: "联系我们的团队，获取适合您业务的产品建议。" },
    "home.contact_us":     { en: "Contact Us",         zh: "联系我们" },

    /* ── About (teammate-owned page) ───────────────────────────────
       Same rule: `en` is the approved copy verbatim. The Aristotle quotation
       and its attribution deliberately carry no key — an attributed quote is
       not ours to translate. "50+" stays as digits. */
    "about.tagline":       { en: "About Yee Lim Adhesives", zh: "关于 Yee Lim Adhesives" },
    "about.title":         { en: "Built on Experience, Quality and Trust", zh: "以经验、品质与信任为基石" },
    "about.lead":          { en: "One of Singapore’s established adhesive manufacturers, providing reliable glue and adhesive solutions for commercial and industrial applications.", zh: "新加坡历史悠久的胶粘剂制造商之一，为商业与工业应用提供可靠的胶水及胶粘解决方案。" },
    "about.who_title":     { en: "Who We Are",        zh: "关于我们" },
    "about.who_p1":        { en: "Yee Lim Adhesives Industries has grown from humble beginnings into a trusted adhesive manufacturer with over 50 years of experience. From commercial uses to industrial applications, we continue to develop practical adhesive solutions for a wide range of industries.", zh: "Yee Lim Adhesives Industries 从小规模起步，发展成为拥有超过 50 年经验、值得信赖的胶粘剂制造商。从商业用途到工业应用，我们持续为各行各业开发实用的胶粘解决方案。" },
    "about.who_p2":        { en: "Today, our products support industries such as construction, carpentry, furniture, marine, hardware, leather, craft, OEM services and more.", zh: "如今，我们的产品服务于建筑、木工、家具、船舶、五金、皮革、手工艺、OEM 代工等众多行业。" },
    "about.years_card":    { en: "Years of adhesive manufacturing experience", zh: "年胶粘剂制造经验" },
    "about.mission_title": { en: "Our Mission",       zh: "我们的使命" },
    "about.mission_lead":  { en: "To produce quality adhesives while providing dependable service and support to every customer.", zh: "生产优质胶粘剂，并为每一位客户提供可靠的服务与支持。" },
    "about.m1_title":      { en: "Quality",           zh: "品质" },
    "about.m1_body":       { en: "We strive to deliver consistent adhesive quality that customers can trust for their business operations.", zh: "我们致力于提供稳定一致的胶粘品质，让客户在业务运营中安心依赖。" },
    "about.m2_title":      { en: "Customer Trust",    zh: "客户信任" },
    "about.m2_body":       { en: "Customer satisfaction and long-term relationships remain key drivers behind our growth and reputation.", zh: "客户满意度与长期合作关系，始终是我们成长与声誉的核心动力。" },
    "about.m3_title":      { en: "Innovation",        zh: "创新" },
    "about.m3_body":       { en: "We continuously create and improve adhesive solutions tailored to different industrial applications.", zh: "我们不断针对不同工业应用创造并改进胶粘解决方案。" },
    "about.values_title":  { en: "Our Values",        zh: "我们的价值观" },
    "about.v1_title":      { en: "Reliable Products", zh: "可靠的产品" },
    "about.v1_body":       { en: "We focus on efficiency, consistency and product performance across our adhesive range.", zh: "我们专注于整个胶粘剂系列的效率、一致性与产品性能。" },
    "about.v2_title":      { en: "Environmental Responsibility", zh: "环境责任" },
    "about.v2_body":       { en: "We consider the environmental impact of our products and manufacturing processes through proper housekeeping, procedures and controls.", zh: "我们通过规范的现场管理、作业程序与控制措施，关注产品及生产过程的环境影响。" },
    "about.v3_title":      { en: "Low VOC Solutions", zh: "低 VOC 解决方案" },
    "about.v3_body":       { en: "Low V.O.C. and low formaldehyde adhesive solutions are available for customers who require safer and more environmentally conscious options.", zh: "我们为需要更安全、更环保选择的客户提供低 V.O.C. 及低甲醛胶粘解决方案。" },
    "about.cta_title":     { en: "Need a Reliable Adhesive Partner?", zh: "需要可靠的胶粘合作伙伴？" },
    "about.cta_lead":      { en: "Speak to our team to find the right adhesive solution for your business.", zh: "联系我们的团队，为您的业务找到合适的胶粘解决方案。" },
    "about.contact_us":    { en: "Contact Us",         zh: "联系我们" }
  };

  function getLang() {
    try { return localStorage.getItem("ylLang") === "zh" ? "zh" : "en"; }
    catch (e) { return "en"; }
  }

  window.ylLang = getLang();

  // Translate a key; falls back to English, then to the key itself.
  window.ylT = function (key) {
    var e = DICT[key];
    if (!e) return key;
    return e[window.ylLang] || e.en || key;
  };

  // The authoritative English for a key, regardless of the active language.
  // Restoring English must NOT be done from a DOM snapshot: markup built by JS
  // (the navbar, the footer) renders in whatever language was active when it
  // was built, so on a page loaded in Chinese that snapshot IS Chinese.
  window.ylTEn = function (key) {
    var e = DICT[key];
    return e ? e.en : undefined;
  };

  // Switch language and reload so every script re-renders in the new language.
  // LANG-001: switching language used to call window.location.reload(), which
  // made it the only action on the site that hard-refreshed — white flash,
  // scroll jumped to the top, and every asset re-evaluated. It reloaded because
  // JS-rendered content (product cards, the compare tray, the picker, the
  // detail page) bakes in the language at render time, and ylApplyI18n only
  // re-translates static [data-i18n] markup.
  //
  // It runs as a Swup visit to the current URL, so changing language gets the
  // same cross-fade as moving between pages — deliberate, and what the design
  // calls for: the page really is being re-rendered, and showing that reads
  // better than the text silently mutating underneath the reader.
  //
  // The visit does the heavy lifting for free: it replaces #swup, then
  // afterSwap() re-applies i18n AND re-runs every ylReady callback, which is
  // what re-renders the JS-built content (product grid, compare tray, detail
  // page) in the new language.
  //
  // history: "replace" because a language change is not a new destination —
  // Back must still leave the page, not undo the language.
  //
  // Falls back to a reload wherever Swup is unavailable (the 404 page does not
  // load it, and any page where it failed to initialise).
  window.ylSetLang = function (lang) {
    lang = lang === "zh" ? "zh" : "en";
    if (lang === window.ylLang) return;
    try { localStorage.setItem("ylLang", lang); } catch (e) {}
    window.ylLang = lang; // must be live BEFORE anything re-renders

    var swup = window.ylSwup;
    if (!swup || typeof swup.navigate !== "function") {
      window.location.reload();
      return;
    }
    // Hold the reading position: the transition is welcome, being thrown back
    // to the top of the page is not.
    var y = window.pageYOffset;
    try {
      swup.navigate(window.location.href, { history: "replace" });
    } catch (e) {
      window.location.reload();
      return;
    }
    var restore = function () {
      window.scrollTo(0, y);
      // The navbar and footer live OUTSIDE #swup, so a visit never replaces
      // them. Retranslate them in place and flip the switcher itself.
      window.ylApplyI18n(document);
      if (typeof window.ylSyncNavLang === "function") window.ylSyncNavLang();
      swup.hooks.off("page:view", restore);
    };
    swup.hooks.on("page:view", restore);
  };

  // Apply translations to any [data-i18n] / [data-i18n-attr] elements in root.
  // English is the source-of-truth HTML, so we only swap text when in Chinese;
  // in English the original markup is left untouched (no need for en to match).
  // LANG-002: this used to `return` immediately whenever the language was not
  // Chinese, because English was assumed to BE the markup. That holds on a cold
  // load, but not once the language can change in place: after translating to
  // Chinese, switching back to English found no English left to restore and the
  // page stayed Chinese. The original English is now cached on the element the
  // first time it is replaced, and restored on the way back.
  window.ylApplyI18n = function (root) {
    document.documentElement.lang = window.ylLang === "zh" ? "zh-Hans" : "en";
    var zh = window.ylLang === "zh";
    var scope = root || document;

    scope.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      // Cache the markup's own text ONLY as a last resort for keys the
      // dictionary does not carry. The dictionary is the source of truth.
      if (el.dataset.i18nEn === undefined) el.dataset.i18nEn = el.textContent;
      if (zh) {
        var t = window.ylT(key);
        if (t) el.textContent = t;
      } else {
        var en = window.ylTEn(key);
        el.textContent = (en !== undefined) ? en : el.dataset.i18nEn;
      }
    });

    scope.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(",").forEach(function (pair) {
        var bits = pair.split(":");
        var attr = (bits[0] || "").trim();
        var key = (bits[1] || "").trim();
        if (!attr || !key) return;
        var cache = "i18nEnAttr" + attr.replace(/[^a-z0-9]/gi, "");
        if (el.dataset[cache] === undefined) el.dataset[cache] = el.getAttribute(attr) || "";
        if (zh) {
          var t = window.ylT(key);
          if (t) el.setAttribute(attr, t);
        } else {
          // Same rule as textContent: dictionary first, DOM snapshot only as a
          // fallback, since a JS-built attribute may have been written in zh.
          var enAttr = window.ylTEn(key);
          if (enAttr === undefined) enAttr = el.dataset[cache];
          if (enAttr) el.setAttribute(attr, enAttr);
        }
      });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { window.ylApplyI18n(); });
  } else {
    window.ylApplyI18n();
  }
})();
