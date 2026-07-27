/* ─── Product-data Chinese translations (Phase 2) ─────────────────────
   The admin panel stays English-only (staff manage the English catalogue);
   the Chinese product content lives HERE, keyed by product id. Any field left
   out falls back to the English value from the catalogue, so partial coverage
   is safe: untranslated products simply render in English.

   HOW TO EXTEND: for each product, add an entry keyed by its id with any of
   { name, shortDescription, fullDescription, usage }. When a product is added
   or edited in the admin, add/refresh its entry here.

   NOTE: these are FIRST-PASS DRAFTS covering all 31 products' descriptions.
   A native speaker should review every string before this goes fully live.
   The `usage` / "Suitable for" application lists are intentionally left in
   English for now (the detail page parses them with an English delimiter);
   translating those needs a matching parser change (Phase 2b).
   ──────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  window.YL_PRODUCT_ZH = {
    "1": {
      shortDescription: "Deer™ Brand 101 是一款溶剂型胶粘剂，专为鞋类与皮革工艺的粘合而配制。",
      fullDescription: "Deer™ Brand 101 是一款溶剂型胶粘剂，专为鞋类与皮革工艺的粘合而配制。作为 Yee Lim 旗下的经典胶粘剂产品，长期以来深受工匠信赖。正确使用时，可为成品交付提供理想的粘合效果。"
    },
    "2": {
      shortDescription: "更高等级的溶剂型胶粘剂，专为贴面与皮革工艺而配制。",
      fullDescription: "Deer™ Brand 129 是一款更高等级的溶剂型胶粘剂，专为贴面与皮革工艺而配制。其性能与 Deer™ Brand 101 相近，但对表面较粗糙的皮革材料提供更高的耐久性与粘合强度，同时也适用于家具与木材表面的贴面工序。"
    },
    "3": {
      shortDescription: "重型溶剂型胶粘剂，适用于瓷砖、石材、大理石、金属及架高工程。",
      fullDescription: "Deer™ Brand 212 是一款重型溶剂型胶粘剂，适用于瓷砖、石材、大理石、金属及架高工程。本产品经特别配制，具有高强度、防水、低垂流及持久等特性。其缓慢固化的特性为使用者提供充足的定位与调整时间，从而满足坚固耐用的作业需求。"
    },
    "4": {
      shortDescription: "重型溶剂型胶粘剂，适用于人造草坪／地毯草。",
      fullDescription: "Deer™ Brand 212G 是一款重型溶剂型胶粘剂，适用于人造草坪／地毯草。本产品经特别配制，具有高强度、防水、低垂流、持久等特性，最重要的是颜色与草坪相匹配。其缓慢固化的特性为使用者提供充足的定位与调整时间。"
    },
    "5": {
      shortDescription: "低气味的溶剂型泡棉与塑料胶粘剂，适用于泡棉、隔热材料及室内绿化工程。",
      fullDescription: "Deer™ Brand 232 是一款低毒、低气味的溶剂型胶粘剂。它具有高抗拉强度与快速固化的特性，有助于提升作业效果与效率。凭借这些特性，本胶粘剂可广泛应用于多个行业，从生产包装材料、床垫、枕头的泡棉行业，到室内绿化与垂直绿化工程。"
    },
    "6": {
      shortDescription: "Deer™ Brand 232-FG 俗称信用卡胶或可移除胶，是一款低毒溶剂型胶粘剂，专为营销与广告用途而配制。",
      fullDescription: "Deer™ Brand 232-FG 俗称信用卡胶或可移除胶，是一款低毒溶剂型胶粘剂，专为营销与广告用途而配制。它可为卡片与营销样品提供适度的固定力，同时不留残胶或撕裂痕迹。使用不受限制，使用者可按所需的大小与数量点涂胶点。"
    },
    "7": {
      shortDescription: "低气味、较低粘度的溶剂型泡棉与塑料胶粘剂，适用于喷涂施工。",
      fullDescription: "Deer™ Brand 232ST 是一款低毒、低气味的溶剂型胶粘剂，可归类于与 Deer™ Brand 232 相同的类别。凭借较低的粘度，232ST 可采用喷涂方式施工。它具有高抗拉强度与快速固化的特性，有助于提升作业效果与效率。"
    },
    "8": {
      shortDescription: "Deer™ Brand 313 PVC 胶粘剂适用于 PVC 管与 PVC 管之间的粘接。",
      fullDescription: "Deer™ Brand 313 PVC 胶粘剂适用于 PVC 管与 PVC 管之间的粘接。本胶粘剂无色、快干，涂胶后可立即粘接，干燥与固定时间约为 3-5 分钟。一旦固定，管件将形成不可拆卸的接头。为获得最佳粘接效果，粘接后请让其固化至少 24 小时以达到更高强度。"
    },
    "9": {
      shortDescription: "Deer™ Brand 500 亚克力胶粘剂适用于亚克力与亚克力之间的粘接。",
      fullDescription: "Deer™ Brand 500 亚克力胶粘剂适用于亚克力与亚克力之间的粘接。本胶粘剂无色、快干，涂胶后可立即粘接，干燥与固定时间约为 3-5 分钟。一旦固定，亚克力胶将形成不可拆卸的接头。为获得最佳粘接效果，粘接后请让其固化至少 24 小时以达到更高强度。"
    },
    "10": {
      shortDescription: "溶剂型隔热胶粘剂，用于将玻璃纤维／矿棉粘接到铝板上。",
      fullDescription: "Deer™ Brand 969 系列是一款溶剂型胶粘剂，专为多个行业的最佳应用而配制。Deer™ Brand 969-A 的特性可确保易于喷涂，且干燥时间相对较快。本胶粘剂专为将玻璃纤维隔热棉粘接到铝板而配制。"
    },
    "11": {
      shortDescription: "溶剂型软垫与海绵胶粘剂，适用于汽车与隔热应用。",
      fullDescription: "基材：溶剂型。施工方法：喷涂、刷涂、滚涂。可粘接：泡棉与海绵、汽车内饰、橡胶、玻璃纤维棉。"
    },
    "12": {
      shortDescription: "Deer™ Brand 969NT 是一款低气味的溶剂型胶粘剂，适用于地毯工程。",
      fullDescription: "Deer™ Brand 969NT 是一款低气味的溶剂型胶粘剂，适用于地毯工程。本胶粘剂足够坚韧，可承受在地毯卷上行走与踩踏所产生的高摩擦。溶剂型胶粘剂在使用时通常带有刺鼻气味，可能令部分人感到不适。因此，本胶粘剂经特别配制以降低气味，让地毯铺设工作得以轻松进行。"
    },
    "13": {
      shortDescription: "溶剂型玻璃纤维胶粘剂，适用于玻璃纤维与铝的粘接。",
      fullDescription: "关于 Deer™ Brand 969WT 暂无详细资料。用途：玻璃纤维与铝的粘接。"
    },
    "14": {
      shortDescription: "Deer™ Brand PVA（也常称为 PVAC）是一款水性胶粘剂，用于手工艺制作。",
      fullDescription: "Deer™ Brand PVA（也常称为 PVAC）是一款水性胶粘剂，用于手工艺制作。涂胶后有充足的开放时间，可进行调整与重新对位，以达到最终理想的成品。干燥后，胶层略具柔韧性并提供牢固的粘合。PVA 胶不会释放危险气体或毒素，因此是最安全、适合非专业人士使用的胶粘剂之一。"
    },
    "15": {
      shortDescription: "Horsemen™ Brand 707 是一款溶剂型胶粘剂，广泛用于防水专业工程。",
      fullDescription: "Horsemen™ Brand 707 是一款溶剂型胶粘剂，广泛用于防水专业工程。其配方提供出色的抗拉强度，可对防水卷材提供足够的抓附力。本胶粘剂对软垫、地毯及其他通用工程等多种材料也具有良好的粘合力。因此，在某些地区，本产品在制鞋用途上也颇受欢迎。"
    },
    "16": {
      shortDescription: "Horsemen™ Brand 707A5 是一款溶剂型胶粘剂，广泛用于木工。",
      fullDescription: "Horsemen™ Brand 707A5 是一款溶剂型胶粘剂，广泛用于木工。其配方易于涂布且快速干燥。"
    },
    "17": {
      shortDescription: "Horsemen™ Brand 707C 是一款溶剂型胶粘剂，广泛用于地毯安装人员与专业人士。",
      fullDescription: "Horsemen™ Brand 707C 是一款溶剂型胶粘剂，广泛用于地毯安装人员与专业人士。其配方易于涂布，提供足够的粘合强度与柔韧性，可应对日常人流。"
    },
    "18": {
      shortDescription: "Horsemen™ Brand 707S 是一款溶剂型胶粘剂，广泛应用于多个行业。",
      fullDescription: "Horsemen™ Brand 707S 是一款溶剂型胶粘剂，广泛应用于多个行业。其配方具有出色的喷涂性能与干燥时间，因此被广泛用于要求高效率与短作业时间的行业。本胶粘剂对软垫、皮革、防水卷材及其他通用工程等多种材料也具有良好的粘合力。"
    },
    "19": {
      shortDescription: "Premier™ Brand 100 是一款水性压敏地毯砖胶粘剂，同时也适用于压敏标签制作。",
      fullDescription: "Premier™ Brand 100 系列水性胶粘剂是一系列压敏胶粘剂，提供高粘合强度以满足严苛的要求。Premier™ Brand 100 胶粘剂广泛用于地毯砖铺贴用途，并已证实适用于软质与硬质基材的地毯砖。"
    },
    "20": {
      shortDescription: "更高等级的水性压敏地毯砖胶粘剂。",
      fullDescription: "Premier™ Brand 100 系列水性胶粘剂是一系列压敏胶粘剂，提供高粘合强度以满足严苛的要求。Premier™ Brand 100B、100B2、100E、100E2 及 110 胶粘剂广泛用于地毯砖铺贴用途，并已证实适用于软质与硬质基材的地毯砖。"
    },
    "21": {
      shortDescription: "更高等级的水性压敏地毯砖胶粘剂。",
      fullDescription: "Premier™ Brand 100 系列水性胶粘剂是一系列压敏胶粘剂，提供高粘合强度以满足严苛的要求。Premier™ Brand 100B、100B2、100E、100E2 及 110 胶粘剂广泛用于地毯砖铺贴用途，并已证实适用于软质与硬质基材的地毯砖。"
    },
    "22": {
      shortDescription: "较低等级的水性压敏地毯砖胶粘剂。",
      fullDescription: "Premier™ Brand 100 系列水性胶粘剂是一系列压敏胶粘剂，提供高粘合强度以满足严苛的要求。Premier™ Brand 100B、100B2、100E、100E2 及 110 胶粘剂广泛用于地毯砖铺贴用途，并已证实适用于软质与硬质基材的地毯砖。"
    },
    "23": {
      shortDescription: "Premier™ Brand 138 是一款溶剂型胶粘剂，专为鞋类及多种皮革工艺而配制。",
      fullDescription: "Premier™ Brand 138 是一款溶剂型胶粘剂，专为鞋类及多种皮革工艺而配制。本胶粘剂已证实适合这些工匠使用，正确使用时可为成品交付提供理想效果。"
    },
    "24": {
      shortDescription: "Premier™ Brand 2000 是一款水性压敏胶粘剂，适用于 PVC 与乙烯基地砖。",
      fullDescription: "Premier™ Brand 2000 是一款水性压敏胶粘剂，提供高粘合强度以满足严苛的要求。Premier™ Brand 2000 广泛用于 PVC 与乙烯基地砖的粘接。本胶粘剂具有柔韧性与回弹性，完全固化后可承受因使用者活动（如行走）所造成的长期摩擦，让使用者在严苛环境中也能安心使用。"
    },
    "25": {
      shortDescription: "Premier™ Brand 202 是一款溶剂型胶粘剂，适用于防水卷材、垫片粘接及电梯／扶梯贴面。",
      fullDescription: "Premier™ Brand 202 是一款溶剂型胶粘剂，提供高粘合强度以满足严苛的要求。本胶粘剂适用于防水卷材粘接、垫片粘接，以及用于升降机、电梯和扶梯的贴面。"
    },
    "26": {
      shortDescription: "Premier™ Brand 3000 系列是一系列以天然成分制成的环保墙纸胶粘剂。",
      fullDescription: "Premier™ Brand 3000 系列是一系列以天然成分制成的环保墙纸胶粘剂。这些胶粘剂还具有以下特性：易于调配（加水搅拌即可）、良好的固定力、可自行控制粘度与粘性、固化前允许重新对位与抚平、环保安全、施工中与施工后均无气味。Premier™ Brand 3001 为更高等级与强度。"
    },
    "27": {
      shortDescription: "Premier™ Brand 5050 是一款以植物纤维制成的环保墙纸胶粘剂。",
      fullDescription: "Premier™ Brand 5050 是一款以植物纤维制成的环保墙纸胶粘剂。本胶粘剂还具有以下特性：预混合、良好的固定力、固化前允许重新对位与抚平、环保安全、施工中与施工后均无气味。"
    },
    "28": {
      shortDescription: "Premier™ Brand G100 是一款环保、低 VOC 的水性地毯砖胶粘剂，已列入新加坡绿色标签计划。",
      fullDescription: "Premier™ Brand G100 水性胶粘剂是一款压敏胶粘剂，提供高粘合强度以满足严苛的要求。随着向绿色环保产品的转变，G100 应运而生，是一款低 VOC、低排放的环保胶粘剂。其性能与其他 100 系列胶粘剂相近，G100 同样适用于软质与硬质基材的地毯砖。"
    },
    "29": {
      shortDescription: "Rhino™ Brand 909 是一款溶剂型胶粘剂，专为贴面工程而配制。",
      fullDescription: "Rhino™ Brand 909 是一款溶剂型胶粘剂，专为贴面工程而配制。Rhino™ Brand 909 经特别配制，为施工提供充足且便利的时间。正确固化与粘接后，本胶粘剂可为层压板（如防火板）与木工及家具的粘合提供出色的外观、耐久性与强度。"
    },
    "30": {
      shortDescription: "专业胶粘剂喷枪，配备 2.5mm 喷嘴，用于喷涂喷涂级胶粘剂。",
      fullDescription: "专为喷涂级胶粘剂设计的胶粘剂喷枪。操作简便，专为长期、大批量作业而打造，同时提供均匀的喷涂效果。配备三组喷涂控制（出胶量、扇面与气量），并附带清洁套件与快接喷嘴。"
    },
    "31": {
      shortDescription: "专业胶粘剂喷枪，配备 2.0mm 喷嘴，用于喷涂喷涂级胶粘剂。",
      fullDescription: "专为喷涂级胶粘剂设计的胶粘剂喷枪。操作简便，专为长期、大批量作业而打造，同时提供均匀的喷涂效果。配备三组喷涂控制（出胶量、扇面与气量），并附带清洁套件与快接喷嘴。"
    }
  };

  // Return a product field in Chinese when zh is active and a translation exists;
  // otherwise the original English value from the catalogue. Product model names
  // (e.g. "Deer™ Brand 101") intentionally stay in Latin.
  window.ylPField = function (p, field) {
    if (!p) return "";
    if (window.ylLang === "zh") {
      var t = window.YL_PRODUCT_ZH[p.id];
      if (t && t[field]) return t[field];
    }
    return p[field] != null ? p[field] : "";
  };

  // ── Data-value term map (industries, surfaces, product types, application
  //    methods, "suitable for" uses, characteristics, sizes) ──────────────
  var TERMS = {
    // Product types / subtypes / categories
    "Solvent-based Adhesive": "溶剂型胶粘剂", "Water-based Adhesive": "水性胶粘剂",
    "Application Equipment": "施工设备", "Spray Guns & Accessories": "喷枪及配件",
    "Solvent-based": "溶剂型", "Water-based": "水性", "Adhesive": "胶粘剂",
    "Accessory": "配件", "General Adhesive Use": "通用粘合用途",
    "Adhesives": "胶粘剂", "Industrial": "工业", "Others": "其他",
    "Adhesive Solution": "胶粘方案",
    // Application method sentences (Application tab)
    "Apply by brush or roll.": "刷涂或滚涂。",
    "Apply by spray, brush or roll.": "喷涂、刷涂或滚涂。",
    "Apply by scrape, brush or roll.": "刮涂、刷涂或滚涂。",
    "Apply by dip.": "浸涂。",
    "1. Ensure bonding surface are cleaned, dried and free from any contaminants. 2. Ensure the bonding edges of both surface are well aligned and smooth. 3. Apply adhesive on both bonding surface using a injection kit or brush and bond immediately. 4. Allow both bonding pieces to lay and set for at least 30 - 45mins before shifting or lifting up. 5. Initial strength achieve within short period of time. For best adhesion effect, allow up to 24 hours curing time":
      "1. 确保粘接面清洁、干燥且无任何污染物。 2. 确保两个粘接面的边缘对齐平整。 3. 使用注胶套件或毛刷在两个粘接面上涂胶并立即粘合。 4. 让两个粘接件静置定型至少 30 - 45 分钟后再移动或提起。 5. 短时间内即可获得初始强度；为达到最佳粘接效果，请预留最多 24 小时固化时间。",
    "Ensure bonding pipes/surface are cleaned, dried and free from any contaminants. Apply adhesive on the both entire bonding surface (e.g. the entire circumference of both pipe). Push and twist both pipes in one full cycle to ensure proper spread and coverage of adhesive. End the twist in its final bonding position and let dry for at least 3 - 5 minutes. Initial strength achieve within short period of time. For best adhesion effect, allow up to 24 hours curing time.":
      "确保待粘接的管件／表面清洁、干燥且无任何污染物。在两个粘接面的整个面积上涂胶（例如两根管的整圈周长）。将两根管推合并旋转一整圈，确保胶水均匀铺展与覆盖。在最终粘接位置结束旋转，静置至少 3 - 5 分钟。短时间内即可获得初始强度；为达到最佳粘接效果，请预留最多 24 小时固化时间。",
    "For use with spray-grade adhesives. Adjust the three spray controls (volume, fan and air) to suit the job; clean after use with the supplied cleaning kit.":
      "适用于喷涂级胶粘剂。根据作业需要调节三组喷涂控制（出胶量、扇面与气量）；使用后用随附的清洁套件清洁。",
    // Application-method values (spec-table "Application Method" row)
    "Brush or Roll": "刷涂或滚涂", "Brush, Roll or Injection": "刷涂、滚涂或注入",
    "Dip": "浸涂", "Scrape, Brush or Roll": "刮涂、刷涂或滚涂",
    "Spray, Brush or Roll": "喷涂、刷涂或滚涂",
    // Key-benefit strings (Application tab)
    "3 spray controls (volume, fan, air)": "三组喷涂控制（出胶量、扇面、气量）",
    "Includes cleaning kit & quick-attach mouthpiece": "含清洁套件及快接喷嘴",
    "Singapore Green Label scheme": "新加坡绿色标签计划",
    // Industries
    "Automotive": "汽车", "Carpentry": "木工", "Cooling Process": "冷却工艺",
    "Fashion": "时尚", "Flooring": "地板", "Insulation": "隔热",
    "Lift & Escalator": "电梯与扶梯", "Marine": "船舶", "Packaging": "包装",
    "Plumbing & Sanitary": "管道与卫生", "Upholstery": "软垫家具", "Waterproof": "防水",
    // Surfaces / materials
    "Carpet": "地毯", "Fibreglass Wool": "玻璃纤维棉", "Foam & Sponge": "泡棉与海绵",
    "Labels": "标签", "Laminates": "层压板", "Leather": "皮革", "Metal": "金属",
    "Paper": "纸张", "Plastics & Acrylics": "塑料与亚克力", "Rubber": "橡胶",
    "Stone Ceramics": "石材与陶瓷", "Tiles": "瓷砖", "Turf": "草坪",
    "Wallpaper": "墙纸", "Wood": "木材",
    // "Suitable for" uses
    "Leather product bonding": "皮革制品粘合", "Shoe in-soles": "鞋内底",
    "General purpose": "通用用途", "General Purpose": "通用用途",
    "Leather crafting": "皮革工艺",
    "Adhesion of laminates (E.g. Carpentry, Door, Cabinet and etc.)": "层压板粘合（如木工、门、橱柜等）",
    "Marine supplies - Building and repair works": "船舶用品的建造与维修工程",
    "Tile bonding": "瓷砖粘合", "Marble bonding": "大理石粘合", "Stone bonding": "石材粘合",
    "Metal bonding": "金属粘合", "Raised flooring joint works": "架高地板接缝工程",
    "Fish ponds": "鱼池", "Artificial Turf": "人造草坪",
    "Artificial Grass/Carpet Grass": "人造草／地毯草", "Synthetic Tiles/Turf": "合成砖／草坪",
    "Foam": "泡棉", "Styrofoam": "泡沫塑料", "Polyfoam": "聚泡棉", "PVC foam": "PVC 泡棉",
    "Plastic": "塑料", "Insulation materials": "隔热材料", "Interior landscaping": "室内绿化",
    "Vertical Gardening": "垂直绿化", "Marketing": "营销", "Advertisements": "广告",
    "Letters": "字母标牌", "Magazine": "杂志", "Credit Card": "信用卡",
    "Fiberglass/Mineral wool to aluminum sheet bonding": "玻璃纤维／矿棉与铝板粘合",
    "Foam & Sponge bonding": "泡棉与海绵粘合", "Sofa manufacturing": "沙发制造",
    "Adhesion for vehicle interior upholstery": "汽车内饰软垫粘合",
    "Rubber mat tiles": "橡胶地垫", "Fibreglass wool bonding": "玻璃纤维棉粘合",
    "Bonding of carpet roll": "地毯卷粘合", "For bonding of carpet roll": "地毯卷粘合",
    "Fiberglass to aluminum bonding": "玻璃纤维与铝粘合",
    "Wood to wood bonding": "木材与木材粘合", "Cloth": "布料",
    "Paper & Book Binding": "纸张与书籍装订", "General Art & Craft": "通用美术与手工",
    "Adhesion of waterproofing membrane to concrete": "防水卷材与混凝土粘合",
    "Adhesion of rubber mat tiles to concrete": "橡胶地垫与混凝土粘合",
    "Bonding of Laminates": "层压板粘合", "Carpet tile bonding": "地毯砖粘合",
    "Carpet tile works": "地毯砖工程", "Labels bonding": "标签粘合",
    "Rubber-typed shoe soles": "橡胶鞋底", "Leather-typed shoes": "皮革鞋",
    "Shoe repair clobbering works": "鞋类修补工程", "PVC & Vinyl tile": "PVC 与乙烯基地砖",
    "Waterproofing membrane works": "防水卷材工程", "Gasket bonding": "垫片粘合",
    "Lift lamination": "电梯贴面", "Rubber bonding": "橡胶粘合",
    "Wallpaper covering works": "墙纸铺贴工程", "Heavy duty wallpaper covering": "重型墙纸铺贴",
    "Furniture upholstery (Sofa making)": "家具软垫（沙发制作）", "Packaging": "包装",
    "Pressure Sensitive Adhesive": "压敏胶粘剂", "Singapore Green Label Scheme": "新加坡绿色标签计划",
    // Characteristics
    "Liquid": "液体", "Liquid (Slight Paste), Transparent": "液体（略带膏状），透明",
    "Liquid, Colourless": "液体，无色", "Liquid, Transparent Yellow": "液体，透明黄色",
    "Liquid, Transparent, Slight amber": "液体，透明，略带琥珀色", "Liquid, White": "液体，白色",
    "Liquid, White (Transparent when dried.)": "液体，白色（干燥后透明）",
    "Liquid, Yellow": "液体，黄色", "Paste, Green": "膏状，绿色", "Paste, Ivory White": "膏状，象牙白",
    "Paste, Transparent White": "膏状，透明白", "Powder, White": "粉末，白色", "Yellow": "黄色",
    "Low VOC (as stated by Yee Lim)": "低 VOC（Yee Lim 声明）",
    "Low / non-detectable formaldehyde (lab-tested)": "低／不可检出甲醛（实验室检测）",
    // Sizes: individual units (lists are split + translated per item by ylTermList)
    "1 US Gallon": "1 美制加仑", "1/4 US Gallon": "1/4 美制加仑",
    "18L": "18 升", "18 Litres": "18 升", "300G": "300 克", "200g": "200 克",
    "150ml": "150 毫升", "200ml": "200 毫升", "250ml": "250 毫升", "400ml": "400 毫升",
    "3KG": "3 公斤", "6KG": "6 公斤", "20KG": "20 公斤",
    "5KGs": "5 公斤", "10KGs": "10 公斤", "20KGs": "20 公斤",
    "75G Tube": "75 克装", "2.5mm nozzle": "2.5mm 喷嘴", "2.0mm nozzle": "2.0mm 喷嘴"
  };

  // Translate a data value/term to Chinese when active (exact/trim match); else
  // returns the original English so anything not in the map degrades gracefully.
  // Compound feature strings ("Application: …", "Available in …") translate their
  // tail after a known label.
  window.ylTerm = function (s) {
    if (window.ylLang !== "zh" || s == null) return s;
    var k = String(s), kt = k.trim(), m;
    if (TERMS[k]) return TERMS[k];
    if (TERMS[kt]) return TERMS[kt];
    if ((m = kt.match(/^application\s*:\s*(.+)$/i))) return "施工方法：" + window.ylTerm(m[1].trim());
    if ((m = kt.match(/^available in\s+(.+)$/i)))    return "规格：" + window.ylTermList(m[1].trim());
    return s;
  };
  // Translate a comma-joined list of terms, item by item.
  window.ylTermList = function (str) {
    if (window.ylLang !== "zh" || !str) return str;
    return String(str).split(/,\s*/).map(function (x) { return window.ylTerm(x.trim()); }).join("，");
  };
  // Greedy phrase tokenizer for "Suitable for:" blobs whose separators were lost
  // in the source data (semicolons stripped, leaving space-run text the renderer
  // deliberately won't guess-split). Matches the LONGEST known term at each
  // position and translates it; any unknown word passes through in English. This
  // only re-joins on dictionary-confirmed boundaries, so it never fabricates a
  // split the way naive space-splitting would.
  var USE_KEYS = null;
  window.ylUses = function (str) {
    if (window.ylLang !== "zh" || !str) return str;
    if (!USE_KEYS) USE_KEYS = Object.keys(TERMS).sort(function (a, b) { return b.length - a.length; });
    var s = String(str).trim(), out = [], guard = 0;
    while (s.length && guard++ < 300) {
      var hit = null;
      for (var i = 0; i < USE_KEYS.length; i++) {
        var kk = USE_KEYS[i];
        if (s.length >= kk.length && s.substring(0, kk.length).toLowerCase() === kk.toLowerCase()) { hit = kk; break; }
      }
      if (hit) { out.push(TERMS[hit]); s = s.substring(hit.length).replace(/^[\s;,.、，；]+/, ""); }
      else {
        var sp = s.search(/\s/);
        if (sp === -1) { out.push(s); s = ""; }
        else { out.push(s.substring(0, sp)); s = s.substring(sp).replace(/^\s+/, ""); }
      }
    }
    return out.join("、");
  };
})();
