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
    "products.count_suffix": { en: "", zh: " 款产品" },
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
    "contact.route_title": { en: "Enquiries & Quotations", zh: "询价与报价" },
    "contact.route_lead":  { en: "For pricing, samples or technical questions, add the products you are interested in to an enquiry and send them in one go. It reaches the same team, with the product details already attached.", zh: "如需报价、样品或技术咨询，请将您感兴趣的产品加入询价单，一次性发送给我们。信息会送达同一团队，并已附上产品详情。" },
    "contact.route_s1":    { en: "Browse the catalogue and add products to your enquiry.", zh: "浏览产品目录，将产品加入询价单。" },
    "contact.route_s2":    { en: "Add your details and any notes on your application.", zh: "填写您的联系资料，并说明使用需求。" },
    "contact.route_s3":    { en: "Send it as one enquiry and our team takes it from there.", zh: "一次性提交询价，我们的团队将接手处理。" },
    "contact.route_cta":   { en: "Start a Product Enquiry", zh: "开始产品询价" },
    "contact.route_browse":{ en: "Browse the catalogue", zh: "浏览产品目录" },
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
    "advisor.error":       { en: "Sorry, I can't connect right now. Please [submit an enquiry](/enquiry) directly.", zh: "抱歉，我暂时无法连接。请直接[提交询价](/enquiry)。" }
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

  // Switch language and reload so every script re-renders in the new language.
  window.ylSetLang = function (lang) {
    lang = lang === "zh" ? "zh" : "en";
    try { localStorage.setItem("ylLang", lang); } catch (e) {}
    if (lang !== window.ylLang) window.location.reload();
  };

  // Apply translations to any [data-i18n] / [data-i18n-attr] elements in root.
  // English is the source-of-truth HTML, so we only swap text when in Chinese;
  // in English the original markup is left untouched (no need for en to match).
  window.ylApplyI18n = function (root) {
    document.documentElement.lang = window.ylLang === "zh" ? "zh-Hans" : "en";
    if (window.ylLang !== "zh") return;
    var scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach(function (el) {
      var t = window.ylT(el.getAttribute("data-i18n"));
      if (t) el.textContent = t;
    });
    scope.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(",").forEach(function (pair) {
        var bits = pair.split(":");
        var attr = (bits[0] || "").trim();
        var key = (bits[1] || "").trim();
        if (attr && key) { var t = window.ylT(key); if (t) el.setAttribute(attr, t); }
      });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { window.ylApplyI18n(); });
  } else {
    window.ylApplyI18n();
  }
})();
