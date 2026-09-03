(async () => {
  "use strict";

  const DEFAULT_SCHEMA_VERSION = "scala-farmer-survey-2026-09-03-v2";
  const DRAFT_KEY = "scala-farmer-survey:draft";
  let SCHEMA_VERSION = DEFAULT_SCHEMA_VERSION;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const slug = (value) =>
    String(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const option = (value, label = value, extra = {}) => ({ value, label, ...extra });

  const matrixDefinitions = {
    financialStability: {
      code: "D12",
      title: "How financially stable is your household?",
      name: "d.financial_stability",
      rows: [{ id: "overall", label: "Household financial stability" }],
      low: "Extremely unstable",
      high: "Very stable",
      single: true,
    },
    communityStatements: {
      code: "C5",
      title: "How much do you agree with each statement?",
      help: "1 = strongly disagree · 5 = strongly agree",
      name: "c.c5",
      low: "Strongly disagree",
      high: "Strongly agree",
      rows: [
        { id: "mutual_help", label: "Farmers in the community help each other when problems arise." },
        { id: "information_access", label: "I have easy access to agricultural information and advice." },
        { id: "disaster_preparedness", label: "My community is prepared for natural disasters." },
        { id: "next_generation", label: "The new generation is interested in continuing agricultural work." },
      ],
    },
    concernRatings: {
      code: "H1",
      title: "How concerned are you about each issue?",
      help: "1 = not at all worried · 5 = extremely concerned",
      name: "h.concern_rating",
      low: "Not worried",
      high: "Extremely concerned",
      rows: [
        { id: "drought", label: "Drought and water scarcity" },
        { id: "flood_landslide", label: "Floods, heavy rain, or landslides" },
        { id: "heat", label: "Elevated temperatures" },
        { id: "disease_pests", label: "Plant or animal disease and pest outbreaks" },
        { id: "price_volatility", label: "Low or fluctuating output prices" },
        { id: "input_cost", label: "Higher input costs" },
        { id: "household_debt", label: "Household debt" },
        { id: "labor_shortage", label: "Farm-labour shortage" },
        { id: "soil_degradation", label: "Soil degradation" },
        { id: "land_rights", label: "Uncertainty over land rights" },
      ],
    },
    maizeWaterSatisfaction: {
      code: "M11",
      title: "Satisfaction with the adequacy of water for agriculture",
      name: "m.m11_water_satisfaction",
      low: "Extremely dissatisfied",
      high: "Extremely satisfied",
      single: true,
      rows: [{ id: "overall", label: "Water adequacy" }],
    },
    maizeForecastConfidence: {
      code: "M20.2",
      title: "Confidence in the accuracy of weather forecasts",
      name: "m.m20_forecast_confidence",
      low: "No confidence",
      high: "Very confident",
      single: true,
      nested: true,
      rows: [{ id: "overall", label: "Forecast confidence" }],
    },
    maizeVarietyCriteria: {
      code: "M24",
      title: "Importance of corn-variety selection criteria",
      help: "1 = not important · 5 = most important",
      name: "m.m24_criteria",
      low: "Not important",
      high: "Most important",
      rows: [
        { id: "yield", label: "High productivity" },
        { id: "weather_tolerance", label: "Drought or weather tolerance" },
        { id: "disease_resistance", label: "Disease and pest resistance" },
        { id: "short_duration", label: "Short time to harvest" },
        { id: "seed_price", label: "Seed price" },
        { id: "sale_price", label: "Expected purchase price" },
        { id: "company_advice", label: "Company recommendation" },
        { id: "farmer_advice", label: "Advice from other farmers" },
        { id: "other", label: "Other criterion" },
      ],
      otherField: { row: "other", name: "m.m24_other_criterion", label: "Other criterion" },
    },
    maizePriceSatisfaction: {
      code: "M33",
      title: "Satisfaction with the purchase price",
      name: "m.m33_price_satisfaction",
      low: "Extremely dissatisfied",
      high: "Extremely satisfied",
      single: true,
      rows: [{ id: "overall", label: "Purchase-price satisfaction" }],
    },
    livestockWaterRatings: {
      code: "L15",
      title: "Satisfaction with livestock water",
      help: "1 = extremely dissatisfied · 5 = extremely satisfied",
      name: "l.l15_water_rating",
      low: "Extremely dissatisfied",
      high: "Extremely satisfied",
      rows: [
        { id: "adequacy", label: "Water adequacy" },
        { id: "quality", label: "Water quality / cleanliness" },
      ],
    },
    livestockStatements: {
      code: "L26A",
      title: "How much do you agree with each statement?",
      help: "1 = strongly disagree · 5 = strongly agree",
      name: "l.l26_statement",
      low: "Strongly disagree",
      high: "Strongly agree",
      rows: [
        { id: "feed_cost", label: "The cost of feed is a heavy burden on my farm." },
        { id: "heat_impact", label: "Heat affects animal health and productivity." },
        { id: "vet_access", label: "I can access veterinary services when needed." },
        { id: "housing_climate", label: "Animal housing is suitable for a changing climate." },
        { id: "price_value", label: "The product price is worth the production cost." },
        { id: "year_round_water", label: "I have adequate water throughout the year." },
      ],
    },
    livestockForecastConfidence: {
      code: "L32.2",
      title: "Confidence in the accuracy of weather forecasts",
      name: "l.l32_forecast_confidence",
      low: "No confidence",
      high: "Very confident",
      single: true,
      nested: true,
      rows: [{ id: "overall", label: "Forecast confidence" }],
    },
    livestockBreedCriteria: {
      code: "L37",
      title: "Importance of breed-selection criteria",
      help: "1 = not important · 5 = most important",
      name: "l.l37_criteria",
      low: "Not important",
      high: "Most important",
      rows: [
        { id: "growth_yield", label: "High growth or yield" },
        { id: "feed_conversion", label: "Good feed-conversion ratio (FCR)" },
        { id: "heat_resistance", label: "Heat or weather resistance" },
        { id: "disease_resistance", label: "Disease resistance" },
        { id: "affordability", label: "Affordable and easy to purchase" },
        { id: "buyer_demand", label: "Market or buyer demand" },
        { id: "local_fit", label: "Easy to raise and suitable for local conditions" },
        { id: "fertility", label: "Fertility" },
        { id: "authority_advice", label: "Recommendation from authorities or partners" },
      ],
    },
    livestockPriceSatisfaction: {
      code: "L45",
      title: "Satisfaction with the purchase price",
      name: "l.l45_price_satisfaction",
      low: "Extremely dissatisfied",
      high: "Extremely satisfied",
      single: true,
      rows: [{ id: "overall", label: "Purchase-price satisfaction" }],
    },
    supportPriorities: {
      code: "N4",
      title: "How important is each type of support?",
      help: "1 = not important · 5 = most important",
      name: "n.n4_support_priority",
      low: "Not important",
      high: "Most important",
      rows: [
        { id: "finance", label: "Low-interest financing or loans" },
        { id: "insurance", label: "Crop or livestock insurance" },
        { id: "resilient_varieties", label: "Weather-resistant seeds or breeds" },
        { id: "water", label: "Irrigation system or water reservoir" },
        { id: "training", label: "Training and knowledge transfer" },
        { id: "weather_warning", label: "Weather information and early-warning systems" },
        { id: "market", label: "Market access and fair pricing" },
        { id: "soil", label: "Soil improvement" },
        { id: "other", label: "Other support" },
      ],
      otherField: { row: "other", name: "n.n4_other_support", label: "Other support needed" },
    },
  };

  const checklistDefinitions = {
    maizeWeedMethods: {
      name: "m.m15_weeding_methods",
      options: [
        option("Hand pulling / manual removal"),
        option("Mechanical tillage or mowing"),
        option("Straw or plastic mulch"),
        option("Ground-cover crops"),
        option("Crop rotation"),
        option("Plant spacing / density to shade weeds"),
        option("Selective herbicide"),
        option("Non-selective herbicide"),
        option("Other", "Other", { other: true }),
      ],
    },
    maizePestMethods: {
      name: "m.m15_pest_methods",
      options: [
        option("Crop rotation"),
        option("Companion planting"),
        option("Natural enemies / biological control"),
        option("Insect traps / sticky panels"),
        option("Chemical pesticide used according to label"),
        option("Chemical pesticide used from habit / experience"),
        option("Biological agents (e.g. Bt, NPV)"),
        option("No management"),
        option("Other", "Other", { other: true }),
      ],
    },
    maizePestObstacles: {
      name: "m.m18_obstacles",
      options: [
        option("High chemical or labour cost"),
        option("Limited pest-identification or management knowledge"),
        option("Difficulty buying biological products or pesticides"),
        option("Insufficient labour"),
        option("Weather or seasonality causes severe infestation"),
        option("Other", "Other", { other: true }),
      ],
    },
    maizeWeatherDecisions: {
      name: "m.m20_weather_decisions",
      options: [
        option("Planting start date"),
        option("Irrigation planning"),
        option("Spraying or fertilising"),
        option("Harvest planning"),
        option("Disaster preparation"),
        option("Other", "Other", { other: true }),
      ],
    },
    contractSupport: {
      name: "l.l7_contract_support",
      options: [
        option("Animal feed"),
        option("Medicines / vaccines"),
        option("Technical advice"),
        option("Purchase guarantee"),
        option("Price assurance"),
        option("Other", "Other", { other: true }),
      ],
    },
    housingFloors: {
      name: "l.l8_floor",
      options: [
        option("Concrete floor"),
        option("Compacted-earth floor"),
        option("Slatted / raised floor"),
        option("Floor covered with bedding material"),
        option("Other", "Other", { other: true }),
      ],
    },
    beddingMaterials: {
      name: "l.l8_bedding",
      options: [
        option("Rice husk"),
        option("Sawdust"),
        option("Straw"),
        option("Crushed corn cobs"),
        option("Not used", "Not used", { exclusive: true }),
        option("Other", "Other", { other: true }),
      ],
    },
    livestockChecks: {
      name: "l.l10_checks",
      options: [
        option("Livestock water-quality test"),
        option("Animal-feed quality test"),
        option("Soil / nutrient test in forage plot"),
        option("Disease check by district / provincial livestock authority"),
        option("Other", "Other", { other: true }),
      ],
    },
    farmCertifications: {
      name: "l.l11_certification",
      options: [
        option("GAP / livestock farm standard"),
        option("Disease-free farm"),
        option("Organic farm"),
        option("GFM standard"),
        option("None", "None", { exclusive: true }),
        option("Unknown", "Unknown", { exclusive: true }),
        option("Other", "Other", { other: true }),
      ],
    },
    livestockProtectedAreas: {
      name: "l.l12_protected_area",
      options: [
        option("National park / no-hunting zone / wildlife sanctuary"),
        option("National Forest Reserve / Permanent Forest Boundary"),
        option("Exempted area under National Land Policy Board Act B.E. 2562 (2019)"),
        option("Not in or near these areas", "Not in or near these areas", { exclusive: true }),
        option("Unknown", "Unknown", { exclusive: true }),
      ],
    },
    livestockWaterSources: {
      name: "l.l13_water_sources",
      options: [
        option("Tap water"),
        option("Groundwater / well"),
        option("Pond / surface water"),
        option("Other", "Other", { other: true }),
      ],
    },
    livestockWaterDelivery: {
      name: "l.l14_water_delivery",
      options: [
        option("Automatic drinkers"),
        option("Troughs / gutters"),
        option("Water tanks / hand-filled containers"),
        option("Access or discharge to natural water source"),
        option("Other", "Other", { other: true }),
      ],
    },
    animalFeedTypes: {
      name: "l.l23_feed_types",
      options: [
        option("Commercial pelleted / ready-made feed"),
        option("Self-mixed feed"),
        option("Agricultural residues"),
        option("Grazing"),
        option("Other", "Other", { other: true }),
      ],
    },
    biosecurityMeasures: {
      name: "l.l27_biosecurity_measures",
      options: [
        option("Vaccination according to programme"),
        option("Disinfectant dip / spray at farm entrance"),
        option("Restrict visitors"),
        option("Quarantine new animals"),
        option("Rest and disinfect housing between cycles"),
        option("Dispose of carcasses safely"),
        option("Control birds, rodents, and other carriers"),
        option("Other", "Other", { other: true }),
      ],
    },
    animalHealthObstacles: {
      name: "l.l30_health_obstacles",
      options: [
        option("High medicine, vaccine, or labour cost"),
        option("Limited disease-identification or management knowledge"),
        option("Difficulty accessing veterinarians / technical services"),
        option("Difficulty obtaining vaccines or supplies"),
        option("Insufficient labour"),
        option("Weather or seasonality causes severe outbreaks"),
        option("Other", "Other", { other: true }),
      ],
    },
    livestockWeatherDecisions: {
      name: "l.l32_weather_decisions",
      options: [
        option("Timing of raising / stocking animals"),
        option("Housing cooling (fans or water spray)"),
        option("Water and feed reserves"),
        option("Seasonal vaccination / disease prevention"),
        option("Animal catching / transport"),
        option("Disaster preparation"),
        option("Other", "Other", { other: true }),
      ],
    },
    breedSources: {
      name: "l.l34_breed_sources",
      options: [
        option("Self-produced / bred"),
        option("Private breeder farm"),
        option("Government animal research / breeding centre"),
        option("Contracting company / cooperative"),
        option("Neighbour / livestock market"),
        option("Other", "Other", { other: true }),
      ],
    },
    livestockProducts: {
      name: "l.l38_products",
      options: [
        option("Live animals"),
        option("Milk"),
        option("Eggs"),
        option("Other", "Other", { other: true }),
      ],
    },
    livestockHarvestMethods: {
      name: "l.l39_methods",
      options: [
        option("Household labour catches / handles animals"),
        option("Hired catching team"),
        option("Buyer catches animals"),
        option("Hand milking"),
        option("Machine milking"),
        option("Manual egg collection"),
        option("Automatic belt egg collection"),
        option("Other", "Other", { other: true }),
      ],
    },
    livestockPostProduction: {
      name: "l.l40_postproduction",
      options: [
        option("Immediate sale without storage"),
        option("Cold milk tank / milk collection centre"),
        option("Egg sizing / cleaning"),
        option("Refrigerated / cold storage"),
        option("Primary processing"),
        option("Other", "Other", { other: true }),
      ],
    },
    livestockStorage: {
      name: "l.l41_storage",
      options: [
        option("Stored on own farm"),
        option("No storage; sell immediately", "No storage; sell immediately", { exclusive: true }),
        option("Cooperative / community collection centre"),
        option("Other", "Other", { other: true }),
      ],
    },
    livestockLossCauses: {
      name: "l.l42_loss_causes",
      options: [
        option("During rearing"),
        option("During storage"),
        option("During transport"),
        option("Rejected / written off by buyer"),
        option("Disease outbreak"),
        option("Heat"),
        option("Accident / animal attack"),
        option("Power outage"),
        option("Broken eggs / wasted milk"),
        option("Natural disaster"),
        option("Other", "Other", { other: true }),
      ],
    },
    livestockBuyerTypes: {
      name: "l.l43_buyer_types",
      options: [
        option("Local trader"),
        option("Slaughterhouse"),
        option("Milk collection centre"),
        option("Cooperative"),
        option("Contracting company"),
        option("Self-retail / community market"),
        option("Other", "Other", { other: true }),
      ],
    },
    livestockPriceFactors: {
      name: "l.l44_price_factors",
      options: [
        option("Animal weight / size"),
        option("Carcass quality / grade"),
        option("Milk quality"),
        option("Egg size / cleanliness"),
        option("Market / declared price"),
        option("Contract price"),
        option("Season / festival"),
        option("Other", "Other", { other: true }),
      ],
    },
    wasteManagementMethods: {
      name: "l.l47_waste_methods",
      options: [
        option("Compost / manure pile"),
        option("Wastewater treatment pond"),
        option("Biogas system"),
        option("Dry, pack, and sell"),
        option("Apply directly to agricultural plots"),
        option("Discharge to natural water source"),
        option("No management system"),
        option("Other", "Other", { other: true }),
      ],
    },
    carcassHandling: {
      name: "l.l47_carcass_handling",
      options: [
        option("Burial"),
        option("Incineration"),
        option("Disposal in designated area"),
        option("Sent to government agency"),
        option("Other", "Other", { other: true }),
      ],
    },
  };

  const recordDefinitions = {
    maizePlots: {
      prefix: "m.plot",
      selectable: true,
      rows: [
        { id: "rainfed", label: "Rainfed corn" },
        { id: "irrigated", label: "Irrigated corn" },
        { id: "post_rice", label: "Corn after rice" },
        { id: "other_crop", label: "Other crop", extraLabel: true },
      ],
      fields: [
        { key: "topography", label: "Topography", type: "checkboxes", options: ["Lowland", "Upland", "Sloping"] },
        { key: "area_rai", label: "Area (rai)", type: "number", min: 0, step: 0.01, className: "short-field" },
      ],
    },
    maizeVarieties: {
      prefix: "m.m23_variety",
      ranked: 5,
      fields: [
        { key: "name", label: "Variety / type", type: "text" },
        { key: "seed_source", label: "Seed source", type: "text" },
        { key: "share_percent", label: "Planted-area share (%)", type: "number", min: 0, max: 100, step: 0.1 },
        { key: "strengths", label: "Main strengths", type: "text" },
      ],
    },
    maizeTransport: {
      prefix: "m.m31_destination",
      rows: [
        { id: "yard_silo", label: "Purchase yard or silo" },
        { id: "processing_plant", label: "Processing plant" },
      ],
      fields: [
        { key: "distance_km", label: "Distance (km)", type: "number", min: 0, step: 0.1 },
        { key: "shipping_cost_baht", label: "Shipping cost (Baht)", type: "number", min: 0, step: 0.01 },
      ],
    },
    livestockTypes: {
      prefix: "l.l1_animal",
      selectable: true,
      rows: [
        { id: "broilers", label: "Broilers" },
        { id: "layers", label: "Layers" },
        { id: "swine", label: "Swine" },
        { id: "beef_cattle", label: "Beef cattle", subtypes: ["Fattening", "Native"] },
        { id: "dairy_cattle", label: "Dairy cattle" },
        { id: "other", label: "Other animal", extraLabel: true },
      ],
      fields: [
        { key: "animal_count", label: "Number of animals", type: "number", min: 0, step: 1 },
        { key: "breeder_count", label: "Number of breeding animals", type: "number", min: 0, step: 1 },
        { key: "rearing_scheme", label: "Rearing scheme", type: "checkboxes", options: ["Independent", "Contract", "Cooperative"] },
      ],
    },
    livestockSystems: {
      prefix: "l.l2_system",
      selectable: true,
      rows: [
        { id: "closed_evap", label: "Closed housing (EVAP)" },
        { id: "open", label: "Open / semi-confined housing" },
        { id: "grazing", label: "Grazing on pasture" },
        { id: "post_harvest", label: "Public areas / fields after harvest" },
        { id: "other", label: "Other system", extraLabel: true },
      ],
      fields: [
        { key: "terrain", label: "Terrain / location", type: "text" },
        { key: "area_rai", label: "Area (rai)", type: "number", min: 0, step: 0.01 },
        { key: "house_count", label: "Number of houses", type: "number", min: 0, step: 1 },
      ],
    },
    feedBrands: {
      prefix: "l.l24_feed_brand",
      ranked: 3,
      fields: [
        { key: "brand", label: "Brand or type", type: "text" },
        { key: "reason", label: "Why selected", type: "textarea" },
      ],
    },
    feedIngredients: {
      prefix: "l.l25_ingredient",
      selectable: true,
      rows: [
        { id: "feed_corn", label: "Feed corn" },
        { id: "bran_grits", label: "Bran / grits" },
        { id: "soybean_meal", label: "Soybean meal" },
        { id: "cassava", label: "Cassava" },
        { id: "fresh_grass_silage", label: "Fresh grass / silage" },
        { id: "corn_stalks", label: "Corn stalks" },
        { id: "straw_residue", label: "Straw / crop residue" },
        { id: "premix", label: "Feed additive / premix" },
        { id: "other", label: "Other ingredient", extraLabel: true },
      ],
      fields: [
        { key: "share_percent", label: "Formula share (%)", type: "number", min: 0, max: 100, step: 0.1 },
        { key: "source", label: "Source", type: "select", options: ["Self-produced", "Community-sourced", "Factory-purchased"] },
        { key: "price_baht_kg", label: "Price per kg (Baht)", type: "number", min: 0, step: 0.01 },
      ],
    },
    livestockBreeds: {
      prefix: "l.l34_breed",
      ranked: 5,
      fields: [
        { key: "description", label: "Species and breed", type: "text" },
        { key: "share_percent", label: "Share (%)", type: "number", min: 0, max: 100, step: 0.1 },
        { key: "source", label: "Breed source", type: "text" },
        { key: "strengths", label: "Breed strengths", type: "text" },
      ],
    },
    livestockHarvestCosts: {
      prefix: "l.l39_cost",
      rows: [
        { id: "labour", label: "Labour for handling / collection / storage" },
        { id: "equipment", label: "Equipment / machinery" },
        { id: "energy", label: "Electricity / fuel" },
      ],
      fields: [
        { key: "frequency", label: "Times per cycle / day", type: "text" },
        { key: "cost_baht", label: "Cost (Baht)", type: "number", min: 0, step: 0.01 },
      ],
    },
    climateLosses: {
      prefix: "a.a3_loss",
      ranked: 5,
      fields: [
        { key: "affected_area", label: "Affected area / activity", type: "text" },
        { key: "hazard_year", label: "Hazard and year", type: "text" },
        { key: "damage", label: "Damage details", type: "textarea" },
        { key: "value_baht", label: "Estimated loss (Baht)", type: "number", min: 0, step: 0.01 },
      ],
    },
    adaptationMeasures: {
      prefix: "n.n1_measure",
      ranked: 5,
      fields: [
        { key: "area", label: "Area of action", type: "text" },
        { key: "details", label: "Measure details", type: "textarea" },
        { key: "annual_cost_baht", label: "Annual cost (Baht)", type: "number", min: 0, step: 0.01 },
      ],
    },
    supportReceived: {
      prefix: "n.n2_support",
      ranked: 3,
      fields: [
        { key: "area", label: "Area supported / of interest", type: "text" },
        { key: "details", label: "Support or measure details", type: "textarea" },
      ],
    },
    supportConstraints: {
      prefix: "n.n3_constraint",
      ranked: 3,
      fields: [
        { key: "constraint", label: "Constraint encountered", type: "textarea" },
        { key: "need", label: "Support needed", type: "textarea" },
      ],
    },
  };

  const maizeSoilActions = {
    compaction: ["No-till", "Strip tillage", "Ridge tillage", "Mulch tillage", "Conventional tillage"],
    acidity: ["Apply lime / dolomite", "Use fertiliser based on soil analysis", "Use biochar", "No soil conditioning"],
    salinity: ["Improve drainage / irrigation", "Use salt-tolerant crops", "Add organic matter", "No management / no solution"],
    sandy: ["Add compost", "Add water-retaining material", "Mulch", "Cover crop", "No additional management"],
    monoculture: ["Add manure / compost", "Legume green manure", "Crop rotation", "Relay / alley cropping", "Biofertiliser", "No soil restoration"],
    contamination: ["Temporarily stop chemical use", "Ground cover / green manure", "Add organic matter", "Shift to organic / reduce chemicals", "Residue analysis", "No management / unknown solution"],
    erosion: ["Contour planting", "Agroforestry", "Cover crop", "No management / unknown solution"],
    other: [],
  };

  const issueDefinitions = {
    maizeSoilProblems: {
      prefix: "m.m13_soil_problem",
      detailLabel: "Management used",
      rows: [
        { id: "compaction", label: "Hard / compacted clay soil with poor drainage" },
        { id: "acidity", label: "Very acidic soil" },
        { id: "salinity", label: "Saline soil" },
        { id: "sandy", label: "Very sandy soil that does not hold water" },
        { id: "monoculture", label: "Degradation from continuous monoculture / nutrient loss" },
        { id: "contamination", label: "Agricultural-chemical contamination" },
        { id: "erosion", label: "Topsoil loss or erosion on sloping land" },
        { id: "other", label: "Other soil problem", otherLabel: true },
      ].map((row) => ({ ...row, severity: true, actions: maizeSoilActions[row.id] })),
    },
    livestockHousingProblems: {
      prefix: "l.l26_housing_problem",
      detailLabel: "How it is managed",
      rows: [
        { id: "heat", label: "Heat / hot-air stress" },
        { id: "ventilation", label: "Poor ventilation / dampness" },
        { id: "wet_floor", label: "Wet or waterlogged floor" },
        { id: "odour", label: "Bad odour" },
        { id: "vectors", label: "Flies, mosquitoes, or other vectors" },
        { id: "flood", label: "Flood or landslide" },
        { id: "damaged_housing", label: "Damaged or inadequate housing" },
        { id: "power", label: "Power outage / fan-system failure" },
        { id: "other", label: "Other housing problem", otherLabel: true },
      ].map((row) => ({ ...row, severity: true, textarea: true })),
    },
    livestockHealthProblems: {
      prefix: "l.l26_health_problem",
      detailLabel: "Disease name and management",
      rows: [
        { id: "respiratory", label: "Respiratory disease" },
        { id: "gastrointestinal", label: "Gastrointestinal disease / diarrhoea" },
        { id: "major_epidemic", label: "Major epidemic (FMD, ASF, avian influenza, lumpy skin, etc.)" },
        { id: "mastitis", label: "Mastitis (dairy cattle)" },
        { id: "internal_parasite", label: "Internal parasites" },
        { id: "external_parasite", label: "External parasites (ticks, mites, fleas)" },
        { id: "reproductive", label: "Reproductive problem" },
        { id: "other", label: "Other health problem", otherLabel: true },
      ].map((row) => ({ ...row, diseaseFields: true })),
    },
    livestockClimateEvents: {
      prefix: "l.l33_event",
      detailLabel: "Impact",
      rows: [
        { id: "heat", label: "Heat wave / extreme heat" },
        { id: "drought", label: "Drought / water shortage" },
        { id: "flood", label: "Flood" },
        { id: "storm", label: "Storm / strong wind" },
        { id: "cold", label: "Unusually cold weather" },
        { id: "disease", label: "Disease outbreak" },
      ].map((row) => ({ ...row, severity: true, textarea: true })),
    },
    integratedPractices: {
      prefix: "l.l48_practice",
      detailLabel: "Plant / animal type or details",
      rows: [
        { id: "crop_residue_feed", label: "Use crop residues as animal feed" },
        { id: "manure_own_fields", label: "Use manure as fertiliser in own crop plots" },
        { id: "sell_manure", label: "Sell manure to other farmers" },
        { id: "post_harvest_grazing", label: "Graze animals in plots after harvest" },
        { id: "fodder_crops", label: "Grow specific fodder crops" },
        { id: "agroforestry", label: "Agroforestry / animals under tree shade" },
        { id: "biogas", label: "Produce biogas from manure" },
      ].map((row) => ({ ...row, textarea: true })),
    },
  };

  const monthGridDefinitions = {
    maizeCalendar: {
      code: "M19",
      title: "Maize cultivation calendar",
      help: "Select every month when each activity normally occurs.",
      prefix: "m.m19_calendar",
      activities: [
        ["soil_preparation", "Prepare soil"],
        ["planting", "Plant"],
        ["fertilising", "Fertilise"],
        ["irrigation", "Provide water"],
        ["weed_pest", "Manage weeds / pests"],
        ["harvest", "Harvest"],
        ["sale", "Sell"],
      ],
    },
    livestockCalendar: {
      code: "L31",
      title: "Livestock production and management calendar",
      help: "The paper form leaves activity names blank. These practical activity rows may be used or left blank.",
      prefix: "l.l31_calendar",
      activities: [
        ["stocking_breeding", "Stocking / breeding"],
        ["birth_hatching", "Birth / hatching"],
        ["vaccination", "Vaccination / parasite control"],
        ["housing_cleaning", "Housing cleaning / disinfection"],
        ["heat_management", "Heat management"],
        ["feed_fodder", "Feed / fodder preparation"],
        ["milk_egg", "Milk / egg collection"],
        ["sale_transport", "Sale / transport"],
        ["manure", "Manure / waste management"],
      ],
    },
  };

  const climateGridDefinitions = {
    rainfallHistory: {
      code: "A1",
      title: "Rainfall perception during the past five years",
      help: "Choose one rainfall condition for each month you can recall. Years are shown in Buddhist Era and Gregorian calendars.",
      prefix: "a.a1_rainfall",
      years: [
        ["2564", "2021"],
        ["2565", "2022"],
        ["2566", "2023"],
        ["2567", "2024"],
        ["2568", "2025"],
      ],
      options: [
        ["1", "1 · Extreme drought"],
        ["2", "2 · Drought"],
        ["3", "3 · Normal"],
        ["4", "4 · Heavy rain"],
        ["5", "5 · Abnormally heavy rain"],
      ],
    },
    hazardHistory: {
      code: "A2",
      title: "Climate or environmental hazards during the past five years",
      help: "Choose the main hazard in each month. Add detail under A3 when several hazards occurred together.",
      prefix: "a.a2_hazard",
      years: [
        ["2564", "2021"],
        ["2565", "2022"],
        ["2566", "2023"],
        ["2567", "2024"],
        ["2568", "2025"],
      ],
      options: [
        ["D", "D · Drought"],
        ["F", "F · Flood"],
        ["S", "S · Storm / strong wind"],
        ["T", "T · Heat wave"],
        ["C", "C · Abnormally cold weather"],
        ["P", "P · Pest / disease outbreak"],
        ["E", "E · Landslide / erosion"],
        ["O", "O · Other"],
      ],
    },
  };

  function renderMatrix(target, definition) {
    const wrapperClass = definition.nested ? "nested-fieldset rating-card" : "question-card rating-card";
    const rows = definition.rows
      .map((row) => {
        const inputName = definition.single ? definition.name : `${definition.name}.${row.id}`;
        const buttons = [1, 2, 3, 4, 5]
          .map(
            (value) => `
              <label class="rating-choice">
                <input name="${escapeHtml(inputName)}" type="radio" value="${value}" aria-label="${escapeHtml(row.label)}: ${value}" />
                <span>${value}</span>
              </label>`,
          )
          .join("");
        const other = definition.otherField?.row === row.id
          ? `<label class="matrix-other"><span>${escapeHtml(definition.otherField.label)}</span><input name="${escapeHtml(definition.otherField.name)}" type="text" maxlength="180" /></label>`
          : "";
        return `
          <div class="rating-row">
            <div class="rating-prompt">${escapeHtml(row.label)}${other}</div>
            <div class="rating-options" role="radiogroup" aria-label="${escapeHtml(row.label)}">${buttons}</div>
          </div>`;
      })
      .join("");

    target.outerHTML = `
      <fieldset class="${wrapperClass}">
        <legend><b>${escapeHtml(definition.code)}.</b> ${escapeHtml(definition.title)}</legend>
        ${definition.help ? `<p class="question-help">${escapeHtml(definition.help)}</p>` : ""}
        <div class="scale-key" aria-hidden="true"><span>${escapeHtml(definition.low)}</span><span>${escapeHtml(definition.high)}</span></div>
        <div class="rating-rows">${rows}</div>
      </fieldset>`;
  }

  function renderChecklist(target, definition, key) {
    const otherTarget = `${key}-other-detail`;
    const options = definition.options
      .map((item) => {
        const controls = item.other ? ` data-controls="${otherTarget}"` : "";
        const exclusive = item.exclusive ? ' data-exclusive="true"' : "";
        return `<label><input name="${escapeHtml(definition.name)}" type="checkbox" value="${escapeHtml(item.value)}"${controls}${exclusive} /><span>${escapeHtml(item.label)}</span></label>`;
      })
      .join("");
    const hasOther = definition.options.some((item) => item.other);
    target.innerHTML = options + (hasOther
      ? `<label class="inline-detail conditional checklist-other" id="${otherTarget}" hidden><span>Please specify</span><input name="${escapeHtml(definition.name)}_other" type="text" maxlength="220" /></label>`
      : "");
  }

  function renderRanked(target, type) {
    const prefix = type === "hopes" ? "h.hope" : "h.concern";
    const placeholder = type === "hopes" ? "A hope for the future…" : "A concern for the future…";
    target.innerHTML = [1, 2, 3, 4, 5]
      .map(
        (rank) => `
          <label class="ranked-field">
            <span>${rank}</span>
            <textarea name="${prefix}.${rank}" rows="2" maxlength="500" placeholder="${placeholder}"></textarea>
          </label>`,
      )
      .join("");
  }

  function renderField(prefix, rowId, field) {
    const name = `${prefix}.${rowId}.${field.key}`;
    const common = `name="${escapeHtml(name)}"${field.min !== undefined ? ` min="${field.min}"` : ""}${field.max !== undefined ? ` max="${field.max}"` : ""}${field.step !== undefined ? ` step="${field.step}"` : ""}`;
    if (field.type === "textarea") {
      return `<label class="record-field ${field.className || ""}"><span>${escapeHtml(field.label)}</span><textarea ${common} rows="3" maxlength="1000"></textarea></label>`;
    }
    if (field.type === "select") {
      return `<label class="record-field ${field.className || ""}"><span>${escapeHtml(field.label)}</span><select ${common}><option value="">Select…</option>${field.options.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}</select></label>`;
    }
    if (field.type === "checkboxes") {
      return `<fieldset class="record-field record-checks"><legend>${escapeHtml(field.label)}</legend><div>${field.options.map((item) => `<label><input name="${escapeHtml(name)}" type="checkbox" value="${escapeHtml(item)}" /><span>${escapeHtml(item)}</span></label>`).join("")}</div></fieldset>`;
    }
    return `<label class="record-field ${field.className || ""}"><span>${escapeHtml(field.label)}</span><input ${common} type="${field.type}" ${field.type === "text" ? 'maxlength="300"' : 'inputmode="decimal"'} /></label>`;
  }

  function renderRecords(target, definition) {
    const rows = definition.ranked
      ? Array.from({ length: definition.ranked }, (_, index) => ({ id: String(index + 1), label: `Priority ${index + 1}`, rank: index + 1 }))
      : definition.rows;

    target.innerHTML = rows
      .map((row) => {
        const selectedName = `${definition.prefix}.${row.id}.selected`;
        const header = definition.selectable
          ? `<label class="record-toggle"><input name="${escapeHtml(selectedName)}" type="checkbox" value="Yes" data-record-toggle="${escapeHtml(definition.prefix)}.${escapeHtml(row.id)}" /><span><strong>${escapeHtml(row.label)}</strong><small>Select to add details</small></span></label>`
          : `<div class="record-title"><span class="rank-badge">${row.rank || "•"}</span><strong>${escapeHtml(row.label)}</strong></div>`;
        const extraLabel = row.extraLabel
          ? `<label class="record-field full-width"><span>Please specify</span><input name="${escapeHtml(definition.prefix)}.${escapeHtml(row.id)}.label" type="text" maxlength="180" /></label>`
          : "";
        const subtypes = row.subtypes
          ? `<fieldset class="record-field record-checks full-width"><legend>Type</legend><div>${row.subtypes.map((item) => `<label><input name="${escapeHtml(definition.prefix)}.${escapeHtml(row.id)}.subtype" type="checkbox" value="${escapeHtml(item)}" /><span>${escapeHtml(item)}</span></label>`).join("")}</div></fieldset>`
          : "";
        const fields = definition.fields.map((field) => renderField(definition.prefix, row.id, field)).join("");
        return `
          <article class="record-card${definition.selectable ? " is-collapsed" : ""}">
            ${header}
            <div class="record-fields" ${definition.selectable ? "hidden" : ""}>
              ${extraLabel}${subtypes}${fields}
            </div>
          </article>`;
      })
      .join("");
  }

  function severityScale(name, label) {
    return `
      <fieldset class="issue-severity">
        <legend>${escapeHtml(label)}</legend>
        <div class="rating-options">${[1, 2, 3, 4, 5].map((value) => `<label class="rating-choice"><input name="${escapeHtml(name)}" type="radio" value="${value}" aria-label="Severity ${value}" /><span>${value}</span></label>`).join("")}</div>
      </fieldset>`;
  }

  function renderIssues(target, definition) {
    target.innerHTML = definition.rows
      .map((row) => {
        const base = `${definition.prefix}.${row.id}`;
        let details = "";
        if (row.otherLabel) {
          details += `<label class="record-field full-width"><span>Problem / practice name</span><input name="${base}.label" type="text" maxlength="220" /></label>`;
        }
        if (row.severity) details += severityScale(`${base}.severity`, "Severity · 1 low, 5 high");
        if (row.actions?.length) {
          details += `<fieldset class="record-field record-checks issue-actions"><legend>${escapeHtml(definition.detailLabel)}</legend><div>${row.actions.map((action) => `<label><input name="${base}.management" type="checkbox" value="${escapeHtml(action)}" /><span>${escapeHtml(action)}</span></label>`).join("")}<label><input name="${base}.management" type="checkbox" value="Other" data-controls="${slug(base)}-other" /><span>Other</span></label></div><label class="inline-detail conditional" id="${slug(base)}-other" hidden><span>Please specify</span><input name="${base}.management_other" type="text" maxlength="300" /></label></fieldset>`;
        } else if (row.diseaseFields) {
          details += `<label class="record-field"><span>Disease / type found</span><input name="${base}.name" type="text" maxlength="240" /></label><label class="record-field"><span>Management (vaccines, medicines, isolation, carcass handling, etc.)</span><textarea name="${base}.management" rows="3" maxlength="1000"></textarea></label>`;
        } else if (row.textarea) {
          details += `<label class="record-field full-width"><span>${escapeHtml(definition.detailLabel)}</span><textarea name="${base}.details" rows="3" maxlength="1000"></textarea></label>`;
        }
        return `
          <article class="issue-card is-collapsed">
            <label class="record-toggle"><input name="${base}.selected" type="checkbox" value="Yes" data-issue-toggle="${escapeHtml(base)}" /><span><strong>${escapeHtml(row.label)}</strong><small>Select if this applies</small></span></label>
            <div class="issue-details" hidden>${details}</div>
          </article>`;
      })
      .join("");
  }

  function renderMonthGrid(target, definition) {
    const rows = definition.activities
      .map(([id, label]) => `
        <div class="month-row">
          <strong>${escapeHtml(label)}</strong>
          <div class="month-options">${MONTHS.map((month) => `<label><input name="${escapeHtml(definition.prefix)}.${id}" type="checkbox" value="${month}" /><span>${month}</span></label>`).join("")}</div>
        </div>`)
      .join("");
    target.innerHTML = `
      <fieldset class="question-card month-card">
        <legend><b>${escapeHtml(definition.code)}.</b> ${escapeHtml(definition.title)}</legend>
        <p class="question-help">${escapeHtml(definition.help)}</p>
        <div class="month-rows">${rows}</div>
      </fieldset>`;
  }

  function renderClimateGrid(target, definition) {
    const years = definition.years
      .map(([beYear, ceYear], yearIndex) => {
        const months = MONTHS
          .map((month) => `
            <label class="climate-month">
              <span>${month}</span>
              <select name="${escapeHtml(definition.prefix)}.${beYear}.${month.toLowerCase()}">
                <option value="">—</option>
                ${definition.options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}
              </select>
            </label>`)
          .join("");
        return `<details class="climate-year" ${yearIndex === 0 ? "open" : ""}><summary><strong>B.E. ${beYear}</strong><span>${ceYear}</span></summary><div class="climate-months">${months}</div></details>`;
      })
      .join("");
    target.innerHTML = `
      <section class="question-card climate-history-card">
        <div class="question-title"><b>${escapeHtml(definition.code)}.</b><h3>${escapeHtml(definition.title)}</h3></div>
        <p class="question-help">${escapeHtml(definition.help)}</p>
        <div class="climate-years">${years}</div>
      </section>`;
  }

  function renderGeneratedContent() {
    $$('[data-matrix]').forEach((target) => renderMatrix(target, matrixDefinitions[target.dataset.matrix]));
    $$('[data-ranked]').forEach((target) => renderRanked(target, target.dataset.ranked));
    $$('[data-checklist]').forEach((target) => renderChecklist(target, checklistDefinitions[target.dataset.checklist], target.dataset.checklist));
    $$('[data-records]').forEach((target) => renderRecords(target, recordDefinitions[target.dataset.records]));
    $$('[data-issues]').forEach((target) => renderIssues(target, issueDefinitions[target.dataset.issues]));
    $$('[data-month-grid]').forEach((target) => renderMonthGrid(target, monthGridDefinitions[target.dataset.monthGrid]));
    $$('[data-climate-grid]').forEach((target) => renderClimateGrid(target, climateGridDefinitions[target.dataset.climateGrid]));
  }

  renderGeneratedContent();

  const configRuntime = window.ScalaSurveyConfig
    ? await window.ScalaSurveyConfig.loadAndApply()
    : { entryMap: {}, formAction: "", submissionEnabled: true, settings: {}, configSource: "built-in" };
  SCHEMA_VERSION = configRuntime.settings?.schema_version || DEFAULT_SCHEMA_VERSION;

  const surveyForm = $("#survey-form");
  const nextButton = $("#next-step");
  const previousButton = $("#previous-step");
  const errorSummary = $("#error-summary");
  const stepList = $("#step-list");
  const draftState = $("#draft-state");
  const submitButton = $("#submit-response");
  const successDialog = $("#success-dialog");
  let currentStepKey = "welcome";
  let saveTimer;
  let submissionInProgress = false;
  let lastSubmittedSnapshot = null;
  let modulesTouched = false;

  function allSteps() {
    return $$(".form-step");
  }

  function selectedValues(name) {
    return $$(`[name="${CSS.escape(name)}"]:checked`).map((input) => input.value);
  }

  function valueOf(name) {
    return $(`[name="${CSS.escape(name)}"]:checked`)?.value ?? $(`[name="${CSS.escape(name)}"]`)?.value ?? "";
  }

  function setDisabledWithin(element, disabled) {
    $$("input, textarea, select, button", element).forEach((control) => {
      if (control.matches("button") && !control.closest(".form-step")) return;
      control.disabled = disabled;
    });
  }

  function setConditionalVisibility(element, visible) {
    if (!element) return;
    element.hidden = !visible;
    element.classList.toggle("is-visible", visible);
    $$("input, textarea, select", element).forEach((control) => {
      control.disabled = !visible;
    });
  }

  function updateControlledTarget(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const controllers = $$(`[data-controls~="${CSS.escape(targetId)}"]`);
    const visible = controllers.some((control) => control.checked);
    setConditionalVisibility(target, visible);
  }

  function updateAllConditionalControls() {
    const targets = new Set($$("[data-controls]").map((control) => control.dataset.controls.split(/\s+/)).flat());
    targets.forEach(updateControlledTarget);

    $$('[data-controls-select]').forEach((select) => {
      setConditionalVisibility(document.getElementById(select.dataset.controlsSelect), select.value === "Yes");
    });

    const hasContract = $$('[name="l.l6_arrangements"]:checked').some((input) => input.value === "Contract farming");
    setConditionalVisibility($("#l7-contract-support"), hasContract);

    const feeds = selectedValues("l.l23_feed_types");
    setConditionalVisibility($("#l24-feed-brands"), feeds.includes("Commercial pelleted / ready-made feed"));
    setConditionalVisibility($("#l25-feed-ingredients"), feeds.includes("Self-mixed feed"));

    const modules = selectedValues("d.modules");
    setConditionalVisibility($("#l25-own-corn"), modules.includes("maize") && modules.includes("livestock"));
    window.ScalaSurveyConfig?.applyLogic();
  }

  function updateRecordToggles() {
    $$('[data-record-toggle]').forEach((toggle) => {
      const card = toggle.closest(".record-card");
      const details = $(".record-fields", card);
      card.classList.toggle("is-collapsed", !toggle.checked);
      details.hidden = !toggle.checked;
      $$("input, textarea, select", details).forEach((control) => {
        control.disabled = !toggle.checked;
      });
    });
    $$('[data-issue-toggle]').forEach((toggle) => {
      const card = toggle.closest(".issue-card");
      const details = $(".issue-details", card);
      card.classList.toggle("is-collapsed", !toggle.checked);
      details.hidden = !toggle.checked;
      $$("input, textarea, select", details).forEach((control) => {
        control.disabled = !toggle.checked;
      });
    });
  }

  function visibleSteps() {
    return allSteps().filter((step) => !step.hidden);
  }

  function updateModuleRouting({ announce = false } = {}) {
    const modules = selectedValues("d.modules");
    const hasMaize = modules.includes("maize");
    const hasLivestock = modules.includes("livestock");
    allSteps().forEach((step) => {
      const module = step.dataset.module;
      if (!module) return;
      const visible = module === "maize" ? hasMaize : hasLivestock;
      step.hidden = !visible;
      setDisabledWithin(step, !visible);
    });

    const routeMessage = $("#route-message");
    if (modules.includes("none")) routeMessage.textContent = "Corn and livestock modules will be skipped.";
    else if (hasMaize && hasLivestock) routeMessage.textContent = "Both corn and livestock modules will be included.";
    else if (hasMaize) routeMessage.textContent = "The corn module will be included; livestock will be skipped.";
    else if (hasLivestock) routeMessage.textContent = "The livestock module will be included; corn will be skipped.";
    else routeMessage.textContent = "Select at least one route before continuing.";

    if (allSteps().find((step) => step.dataset.step === currentStepKey)?.hidden) currentStepKey = "general";
    updateAllConditionalControls();
    buildStepList();
    showStep(currentStepKey, { focus: false });
    if (announce) routeMessage.focus?.();
  }

  function suggestModulesFromOccupation() {
    if (modulesTouched) return;
    const occupation = valueOf("d.occupation");
    const mapping = {
      "Maize or crop farmer": ["maize"],
      "Livestock farmer": ["livestock"],
      "Mixed crop and livestock farmer": ["maize", "livestock"],
    };
    if (!mapping[occupation]) return;
    $$('[name="d.modules"]').forEach((input) => {
      input.checked = mapping[occupation].includes(input.value);
    });
    updateModuleRouting({ announce: true });
  }

  function handleExclusiveCheckbox(input) {
    if (input.type !== "checkbox" || !input.name || !input.checked) return;
    const group = $$(`[name="${CSS.escape(input.name)}"]`);
    if (input.dataset.exclusive === "true") {
      group.filter((peer) => peer !== input).forEach((peer) => {
        peer.checked = false;
        if (peer.dataset.controls) updateControlledTarget(peer.dataset.controls);
      });
    } else {
      group.filter((peer) => peer.dataset.exclusive === "true").forEach((peer) => {
        peer.checked = false;
      });
    }
  }

  function validateHousehold() {
    const total = Number(valueOf("d.household_total"));
    const workers = Number(valueOf("d.household_farm_workers"));
    const fulltime = Number(valueOf("d.household_fulltime"));
    const warning = $("#household-warning");
    let message = "";
    if (total && workers > total) message = "Farm workers cannot exceed all household members.";
    else if (workers && fulltime > workers) message = "Full-time farm workers cannot exceed household members working on the farm.";
    warning.textContent = message;
    return !message;
  }

  function sumNamedSuffix(suffix) {
    return $$(`[name$="${CSS.escape(suffix)}"]`).reduce((sum, input) => sum + (Number(input.value) || 0), 0);
  }

  function updateNumericSummaries() {
    const areaTotal = sumNamedSuffix(".area_rai");
    $("#maize-area-total").textContent = `${areaTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} rai`;

    const maizeShare = $$('[name^="m.m23_variety."][name$=".share_percent"]').reduce((sum, input) => sum + (Number(input.value) || 0), 0);
    $("#maize-variety-warning").textContent = maizeShare > 100 ? `Variety shares total ${maizeShare}%. They should not exceed 100%.` : maizeShare ? `Reported variety share: ${maizeShare}%` : "";

    const breedShare = $$('[name^="l.l34_breed."][name$=".share_percent"]').reduce((sum, input) => sum + (Number(input.value) || 0), 0);
    $("#livestock-breed-warning").textContent = breedShare > 100 ? `Breed shares total ${breedShare}%. They should not exceed 100%.` : breedShare ? `Reported breed share: ${breedShare}%` : "";

    const selfShare = Number(valueOf("l.l23_self_produced_percent"));
    const purchasedShare = Number(valueOf("l.l23_purchased_percent"));
    $("#feed-share-warning").textContent = selfShare || purchasedShare
      ? selfShare + purchasedShare === 100
        ? "Feed shares total 100%."
        : `Feed shares currently total ${selfShare + purchasedShare}%. Please check if both are known.`
      : "";
  }

  function collectAnswers({ includeDisabled = false } = {}) {
    const answers = {};
    $$("input[name], textarea[name], select[name]", surveyForm).forEach((control) => {
      if (!includeDisabled && control.disabled) return;
      if (!includeDisabled && control.closest("[hidden]")) return;
      if (control.type === "checkbox") {
        if (!control.checked) return;
        if (!Array.isArray(answers[control.name])) answers[control.name] = [];
        answers[control.name].push(control.value);
        return;
      }
      if (control.type === "radio") {
        if (control.checked) answers[control.name] = control.value;
        return;
      }
      if (control.value !== "") answers[control.name] = control.value;
    });
    return answers;
  }

  function captureDraft() {
    const values = {};
    $$("input[name], textarea[name], select[name]", surveyForm).forEach((control) => {
      if (control.type === "checkbox") {
        if (!Array.isArray(values[control.name])) values[control.name] = [];
        if (control.checked) values[control.name].push(control.value);
      } else if (control.type === "radio") {
        if (control.checked) values[control.name] = control.value;
      } else {
        values[control.name] = control.value;
      }
    });
    return { version: SCHEMA_VERSION, currentStepKey, modulesTouched, savedAt: new Date().toISOString(), values };
  }

  function saveDraft() {
    try {
      const draft = captureDraft();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date());
      draftState.textContent = `Draft saved on this device at ${time}.`;
    } catch {
      draftState.textContent = "Draft could not be saved on this device.";
    }
  }

  function scheduleDraftSave() {
    clearTimeout(saveTimer);
    draftState.textContent = "Saving draft…";
    saveTimer = setTimeout(saveDraft, 450);
  }

  function restoreDraft() {
    let draft;
    try {
      draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
    } catch {
      return false;
    }
    if (!draft || !draft.values) return false;
    Object.entries(draft.values).forEach(([name, stored]) => {
      $$(`[name="${CSS.escape(name)}"]`, surveyForm).forEach((control) => {
        if (control.type === "checkbox") control.checked = Array.isArray(stored) && stored.includes(control.value);
        else if (control.type === "radio") control.checked = stored === control.value;
        else control.value = stored ?? "";
      });
    });
    currentStepKey = draft.currentStepKey || "welcome";
    modulesTouched = Boolean(draft.modulesTouched);
    const saved = draft.savedAt ? new Date(draft.savedAt) : null;
    draftState.textContent = saved && !Number.isNaN(saved.valueOf())
      ? `Draft restored from ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(saved)}.`
      : "Saved draft restored.";
    return true;
  }

  function clearDraft({ resetForm = false } = {}) {
    localStorage.removeItem(DRAFT_KEY);
    if (resetForm) {
      surveyForm.reset();
      modulesTouched = false;
      currentStepKey = "welcome";
      setDefaultDate();
      updateRecordToggles();
      updateAllConditionalControls();
      updateModuleRouting();
      showStep("welcome");
    }
    draftState.textContent = "No saved draft on this device.";
  }

  function buildStepList() {
    const steps = visibleSteps();
    stepList.innerHTML = steps
      .map((step, index) => `<li><button type="button" data-jump-step="${escapeHtml(step.dataset.step)}"><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml(step.dataset.title)}</button></li>`)
      .join("");
    $$('[data-jump-step]', stepList).forEach((button) => {
      button.addEventListener("click", () => showStep(button.dataset.jumpStep));
    });
  }

  function showStep(stepKey, { focus = true } = {}) {
    const steps = visibleSteps();
    let target = steps.find((step) => step.dataset.step === stepKey) || steps[0];
    currentStepKey = target.dataset.step;
    allSteps().forEach((step) => step.classList.toggle("is-active", step === target));
    const index = steps.indexOf(target);
    const percent = steps.length > 1 ? Math.round((index / (steps.length - 1)) * 100) : 100;
    $("#progress-percent").textContent = percent;
    $("#progress-bar").style.width = `${percent}%`;
    $("#progress-track").setAttribute("aria-valuenow", String(percent));
    $("#progress-label").textContent = target.dataset.title;
    $("#mobile-step-label").textContent = `Step ${index + 1} of ${steps.length} · ${target.dataset.title}`;
    $("#mobile-progress-percent").textContent = `${percent}%`;
    $("#mobile-progress-fill").style.width = `${percent}%`;
    $("#navigation-position").textContent = `${index + 1} of ${steps.length}`;
    previousButton.hidden = index === 0;
    nextButton.hidden = index === steps.length - 1;
    $(".form-navigation").classList.toggle("final-step", index === steps.length - 1);
    $$('[data-jump-step]', stepList).forEach((button) => {
      const isCurrent = button.dataset.jumpStep === currentStepKey;
      button.classList.toggle("is-current", isCurrent);
      if (isCurrent) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    errorSummary.hidden = true;
    if (currentStepKey === "needs") updateReviewSummary();
    scheduleDraftSave();
    if (focus) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      $(".section-heading h2, .hero-card h1", target)?.focus?.({ preventScroll: true });
    }
  }

  function groupIsValid(group) {
    const name = group.dataset.requiredGroup;
    const checked = $$(`[name="${CSS.escape(name)}"]:checked`, group).length > 0;
    group.classList.toggle("has-error", !checked);
    return checked;
  }

  function validateStep(step) {
    let firstInvalid = null;
    let valid = true;
    $$('[data-required-group]', step).forEach((group) => {
      if (!groupIsValid(group)) {
        valid = false;
        firstInvalid ||= group;
      }
    });
    $$("input[required], textarea[required], select[required]", step).forEach((control) => {
      if (control.disabled || control.checkValidity()) return;
      valid = false;
      control.closest(".field-card, .question-card")?.classList.add("has-error");
      firstInvalid ||= control;
    });
    if (step.dataset.step === "general" && !validateHousehold()) {
      valid = false;
      firstInvalid ||= $("#household-warning");
    }
    if (!valid) {
      errorSummary.innerHTML = `<strong>Please check this section.</strong><p>Complete the required item${firstInvalid ? " highlighted below" : "s"} and correct any inconsistent values.</p>`;
      errorSummary.hidden = false;
      errorSummary.focus();
      firstInvalid?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }
    return valid;
  }

  function validateAll() {
    const invalidStep = visibleSteps().find((step) => !validateStep(step));
    const maizeShare = $$('[name^="m.m23_variety."][name$=".share_percent"]:not(:disabled)').reduce((sum, input) => sum + (Number(input.value) || 0), 0);
    const breedShare = $$('[name^="l.l34_breed."][name$=".share_percent"]:not(:disabled)').reduce((sum, input) => sum + (Number(input.value) || 0), 0);
    if (invalidStep) {
      showStep(invalidStep.dataset.step, { focus: false });
      validateStep(invalidStep);
      return false;
    }
    if (maizeShare > 100) {
      showStep("maize_practices", { focus: false });
      errorSummary.innerHTML = `<strong>Please check the corn-variety shares.</strong><p>The total is ${maizeShare}%, which exceeds 100%.</p>`;
      errorSummary.hidden = false;
      errorSummary.focus();
      return false;
    }
    if (breedShare > 100) {
      showStep("livestock_practices", { focus: false });
      errorSummary.innerHTML = `<strong>Please check the livestock-breed shares.</strong><p>The total is ${breedShare}%, which exceeds 100%.</p>`;
      errorSummary.hidden = false;
      errorSummary.focus();
      return false;
    }
    return true;
  }

  function updateReviewSummary() {
    const answers = collectAnswers();
    const modules = selectedValues("d.modules");
    const answered = Object.keys(answers).filter((key) => !key.endsWith(".selected")).length;
    const route = modules.includes("none")
      ? "No production module"
      : [modules.includes("maize") ? "Feed corn" : null, modules.includes("livestock") ? "Livestock" : null].filter(Boolean).join(" + ");
    $("#review-summary").innerHTML = `
      <dl class="review-list">
        <div><dt>Participant ID</dt><dd>${escapeHtml(answers["meta.participant_id"] || "Missing")}</dd></div>
        <div><dt>Interview date</dt><dd>${escapeHtml(answers["meta.date"] || "Missing")}</dd></div>
        <div><dt>Question route</dt><dd>${escapeHtml(route || "Not selected")}</dd></div>
        <div><dt>Answered fields</dt><dd>${answered}</dd></div>
      </dl>`;
  }

  function subset(answers, prefixes) {
    return Object.fromEntries(Object.entries(answers).filter(([key]) => prefixes.some((prefix) => key.startsWith(prefix))));
  }

  function compactJson(section, answers, prefixes) {
    return JSON.stringify({ schema: SCHEMA_VERSION, section, answers: subset(answers, prefixes) });
  }

  function averageRatings(answers, prefix) {
    const values = Object.entries(answers)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => Number(value))
      .filter((value) => Number.isFinite(value));
    return values.length ? String(Math.max(1, Math.min(5, Math.round(values.reduce((a, b) => a + b, 0) / values.length)))) : "";
  }

  function joinValue(value) {
    return Array.isArray(value) ? value.join("; ") : value || "";
  }

  function buildGooglePayload(answers) {
    const payload = new Map();
    const defaultEntryMap = {
      participant_id: "730105851",
      interview_date: "586214593",
      interview_location: "1064558567",
      consent: "1548488798",
      age: "614427163",
      gender: "1518832350",
      occupation: "1181406374",
      farming_years: "292390039",
      education: "1620154603",
      ethnicity: "1033950094",
      household_total: "5237903",
      household_farm_workers: "1684320186",
      land_tenure: "1550721741",
      financial_status: "896028899",
      agricultural_income_share: "732609465",
      financial_stability: "1100989624",
      province: "351154306",
      district: "1461762649",
      subdistrict: "156739556",
      village: "1537917553",
      json_general_and_community_context: "933991319",
      json_community_membership: "578153089",
      community_average_rating: "1775361658",
      json_hopes_and_concerns: "2068025504",
      concern_drought: "10100710",
      concern_flood_landslide: "1217225293",
      concern_heat: "716114873",
      concern_disease_pests: "997853596",
      concern_price_volatility: "68542505",
      concern_input_cost: "1141402020",
      concern_household_debt: "453910813",
      concern_labor_shortage: "1393931812",
      concern_soil_degradation: "61634773",
      concern_land_rights: "1603426565",
      json_corn_plot: "1949558594",
      json_corn_soil_land: "1428930569",
      json_corn_water: "996045301",
      json_corn_soil_problems: "751586416",
      json_corn_weeds_pests: "1227697557",
      json_corn_calendar_weather_systems: "1842809632",
      json_corn_varieties: "1490786184",
      json_corn_harvest_market: "352198314",
      json_livestock_farm: "329405922",
      json_livestock_housing_land: "623361055",
      json_livestock_water_feed: "889952861",
      json_livestock_health: "1387521111",
      json_livestock_climate: "549345395",
      json_livestock_breeds_market: "692996229",
      json_livestock_waste: "1448704257",
      json_climate_history: "2053115840",
      json_climate_losses: "1979045461",
      json_adaptation_measures: "899733878",
      json_support: "534112121",
      additional_feedback: "2139126812",
      follow_up: "1260236400",
    };
    const entryMap = { ...defaultEntryMap, ...(configRuntime.entryMap || {}) };
    const add = (name, value) => {
      if (name && value !== undefined && value !== null && String(value) !== "") payload.set(name, String(value));
    };
    const addEntry = (key, value, suffix = "") => add(entryMap[key] ? `entry.${entryMap[key]}${suffix}` : "", value);

    addEntry("participant_id", answers["meta.participant_id"]);
    const [year, month, day] = String(answers["meta.date"] || "").split("-");
    addEntry("interview_date", year, "_year");
    addEntry("interview_date", month, "_month");
    addEntry("interview_date", day, "_day");
    addEntry("interview_location", answers["meta.location"]);
    addEntry("consent", answers["meta.consent"]?.[0] || answers["meta.consent"]);

    addEntry("age", answers["d.age"]);
    addEntry("gender", answers["d.gender"]);
    addEntry("occupation", [answers["d.occupation"], answers["d.occupation_other"]].filter(Boolean).join(": "));
    addEntry("farming_years", answers["d.farming_years"]);
    addEntry("education", answers["d.education"]);
    addEntry("ethnicity", answers["d.ethnicity"]);
    addEntry("household_total", answers["d.household_total"]);
    addEntry("household_farm_workers", answers["d.household_farm_workers"]);
    addEntry("land_tenure", joinValue(answers["d.land_tenure"]));
    addEntry("financial_status", answers["d.financial_status"]);
    addEntry("agricultural_income_share", answers["d.agricultural_income_share"]);
    addEntry("financial_stability", answers["d.financial_stability"]);

    addEntry("province", answers["c.province"]);
    addEntry("district", answers["c.district"]);
    addEntry("subdistrict", answers["c.subdistrict"]);
    addEntry("village", answers["c.village"]);
    addEntry("json_general_and_community_context", compactJson("general_and_community_context", answers, ["d.", "c.main_", "c.non_", "c.c5"]));
    addEntry("json_community_membership", compactJson("community_membership", answers, ["c.membership"]));
    addEntry("community_average_rating", averageRatings(answers, "c.c5."));

    addEntry("json_hopes_and_concerns", compactJson("hopes_and_concerns", answers, ["h.hope", "h.concern."]));
    ["drought", "flood_landslide", "heat", "disease_pests", "price_volatility", "input_cost", "household_debt", "labor_shortage", "soil_degradation", "land_rights"]
      .forEach((id) => addEntry(`concern_${id}`, answers[`h.concern_rating.${id}`]));

    addEntry("json_corn_plot", compactJson("corn_plot", answers, ["m.plot", "m.m1", "m.m2", "m.m3", "m.coordinates"]));
    addEntry("json_corn_soil_land", compactJson("corn_soil_land", answers, ["m.m4", "m.m5", "m.m6", "m.m7", "m.m8"]));
    addEntry("json_corn_water", compactJson("corn_water", answers, ["m.m9", "m.m10", "m.m11", "m.m12"]));
    addEntry("json_corn_soil_problems", compactJson("corn_soil_problems", answers, ["m.m13"]));
    addEntry("json_corn_weeds_pests", compactJson("corn_weeds_pests", answers, ["m.m14", "m.m15", "m.m16", "m.m17", "m.m18"]));
    addEntry("json_corn_calendar_weather_systems", compactJson("corn_calendar_weather_systems", answers, ["m.m19", "m.m20", "m.m21", "m.m22"]));
    addEntry("json_corn_varieties", compactJson("corn_varieties", answers, ["m.m23", "m.m24", "m.m25", "m.m26"]));
    addEntry("json_corn_harvest_market", compactJson("corn_harvest_market", answers, ["m.m27", "m.m28", "m.m29", "m.m30", "m.m31", "m.m32", "m.m33"]));

    addEntry("json_livestock_farm", compactJson("livestock_farm", answers, ["l.l1", "l.l2", "l.l3", "l.l4", "l.l5", "l.l6", "l.l7"]));
    addEntry("json_livestock_housing_land", compactJson("livestock_housing_land", answers, ["l.l8", "l.l9", "l.l10", "l.l11", "l.l12"]));
    addEntry("json_livestock_water_feed", compactJson("livestock_water_feed", answers, ["l.l13", "l.l14", "l.l15", "l.l22", "l.l23", "l.l24", "l.l25"]));
    addEntry("json_livestock_health", compactJson("livestock_health", answers, ["l.l26", "l.l27", "l.l28", "l.l29", "l.l30"]));
    addEntry("json_livestock_climate", compactJson("livestock_climate", answers, ["l.l31", "l.l32", "l.l33"]));
    addEntry("json_livestock_breeds_market", compactJson("livestock_breeds_market", answers, ["l.l34", "l.l35", "l.l36", "l.l37", "l.l38", "l.l39", "l.l40", "l.l41", "l.l42", "l.l43", "l.l44", "l.l45"]));
    addEntry("json_livestock_waste", compactJson("livestock_waste", answers, ["l.l46", "l.l47", "l.l48"]));

    addEntry("json_climate_history", compactJson("climate_history", answers, ["a.a1", "a.a2"]));
    addEntry("json_climate_losses", compactJson("climate_losses", answers, ["a.a3"]));
    addEntry("json_adaptation_measures", compactJson("adaptation_measures", answers, ["n.n1"]));
    addEntry("json_support", compactJson("support", answers, ["n.n2", "n.n3", "n.n4"]));
    addEntry("json_custom", compactJson("custom_questions", answers, ["custom."]));
    addEntry("additional_feedback", answers["z.additional_feedback"]);
    addEntry("follow_up", answers["z.follow_up"]);
    add("fvv", "1");
    add("pageHistory", "0");
    add("submissionTimestamp", "-1");
    return payload;
  }

  function responseExport(answers) {
    return {
      schema_version: SCHEMA_VERSION,
      exported_at: new Date().toISOString(),
      notice: "Participant-provided questionnaire answers. Handle according to the project data-management protocol.",
      answers,
    };
  }

  function downloadAnswers(snapshot = collectAnswers()) {
    const data = responseExport(snapshot);
    const id = String(snapshot["meta.participant_id"] || "response").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `scala-survey-${id}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function setSubmissionState(message, state = "") {
    const note = $("#submission-note");
    note.textContent = message;
    note.dataset.state = state;
  }

  function submitToGoogle(answers) {
    const transport = $("#google-transport-form");
    transport.replaceChildren();
    buildGooglePayload(answers).forEach((value, name) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      transport.append(input);
    });
    submissionInProgress = true;
    lastSubmittedSnapshot = answers;
    submitButton.disabled = true;
    submitButton.classList.add("is-loading");
    setSubmissionState("Sending response securely to Google Forms…", "sending");
    transport.submit();
    window.setTimeout(() => {
      if (!submissionInProgress) return;
      submissionInProgress = false;
      submitButton.disabled = !navigator.onLine;
      submitButton.classList.remove("is-loading");
      setSubmissionState("We could not confirm delivery. Check the connection and select Submit response again.", "error");
    }, 25000);
  }

  function handleBackendLoad() {
    if (!submissionInProgress) return;
    submissionInProgress = false;
    submitButton.disabled = false;
    submitButton.classList.remove("is-loading");
    setSubmissionState("Response sent.", "success");
    clearDraft();
    if (typeof successDialog.showModal === "function") successDialog.showModal();
    else successDialog.setAttribute("open", "");
  }

  function setDefaultDate() {
    const dateInput = $("#interview-date");
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    dateInput.max = localDate;
    if (!dateInput.value) dateInput.value = localDate;
  }

  function updateConnectionStatus() {
    const status = $("#connection-status");
    const text = $("span:last-child", status);
    const configured = configRuntime.submissionEnabled !== false && Boolean($("#google-transport-form")?.action);
    status.classList.toggle("is-offline", !navigator.onLine);
    status.classList.toggle("is-unconfigured", !configured);
    if (!configured) text.textContent = `${configRuntime.environment === "test" ? "Test" : "Survey"} receiver is not configured`;
    else if (navigator.onLine) text.textContent = `${configRuntime.environment === "test" ? "TEST · " : ""}Online · ready to submit`;
    else text.textContent = "Offline · draft will stay on this device";
    if (!submissionInProgress) submitButton.disabled = !navigator.onLine || !configured;
  }

  nextButton.addEventListener("click", () => {
    const step = allSteps().find((item) => item.dataset.step === currentStepKey);
    if (!validateStep(step)) return;
    const steps = visibleSteps();
    const next = steps[steps.indexOf(step) + 1];
    if (next) showStep(next.dataset.step);
  });

  previousButton.addEventListener("click", () => {
    const steps = visibleSteps();
    const step = steps.find((item) => item.dataset.step === currentStepKey);
    const previous = steps[steps.indexOf(step) - 1];
    if (previous) showStep(previous.dataset.step);
  });

  surveyForm.addEventListener("input", (event) => {
    event.target.closest(".has-error")?.classList.remove("has-error");
    updateNumericSummaries();
    scheduleDraftSave();
  });

  surveyForm.addEventListener("change", (event) => {
    const control = event.target;
    handleExclusiveCheckbox(control);
    if (control.name === "d.occupation") suggestModulesFromOccupation();
    if (control.name === "d.modules") {
      modulesTouched = true;
      updateModuleRouting({ announce: true });
    }
    if (control.dataset.controls) control.dataset.controls.split(/\s+/).forEach(updateControlledTarget);
    if (control.dataset.controlsSelect) setConditionalVisibility(document.getElementById(control.dataset.controlsSelect), control.value === "Yes");
    if (control.matches('[data-record-toggle], [data-issue-toggle]')) updateRecordToggles();
    updateAllConditionalControls();
    updateNumericSummaries();
    scheduleDraftSave();
  });

  surveyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (configRuntime.submissionEnabled === false || !$("#google-transport-form")?.action) {
      setSubmissionState("This survey receiver is not configured. Ask the project administrator to check the Google Sheet settings.", "error");
      return;
    }
    if (!navigator.onLine) {
      setSubmissionState("You are offline. The draft is safe on this device; submit when the connection returns.", "error");
      return;
    }
    if (!validateAll()) return;
    submitToGoogle(collectAnswers());
  });

  $("#download-response").addEventListener("click", () => downloadAnswers());
  $("#download-submitted-response").addEventListener("click", () => downloadAnswers(lastSubmittedSnapshot || collectAnswers()));
  $("#clear-draft").addEventListener("click", () => {
    if (window.confirm("Clear the saved draft and all answers on this device?")) clearDraft({ resetForm: true });
  });
  $("#start-new-response").addEventListener("click", () => {
    successDialog.close?.();
    clearDraft({ resetForm: true });
  });
  $("#google-response-frame").addEventListener("load", handleBackendLoad);

  $("#use-location").addEventListener("click", () => {
    const message = $("#location-message");
    if (!navigator.geolocation) {
      message.textContent = "Location is not available in this browser. Enter coordinates manually.";
      return;
    }
    message.textContent = "Waiting for device permission…";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        $("#farm-latitude").value = position.coords.latitude.toFixed(6);
        $("#farm-longitude").value = position.coords.longitude.toFixed(6);
        message.textContent = `Location added (accuracy approximately ${Math.round(position.coords.accuracy)} m).`;
        scheduleDraftSave();
      },
      () => {
        message.textContent = "Location was not shared. You can enter coordinates manually.";
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });

  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);
  window.addEventListener("beforeunload", saveDraft);

  const restored = restoreDraft();
  setDefaultDate();
  updateRecordToggles();
  updateAllConditionalControls();
  updateModuleRouting();
  updateNumericSummaries();
  updateConnectionStatus();
  buildStepList();
  showStep(restored ? currentStepKey : "welcome", { focus: false });

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }

  window.__surveyDebug = {
    schemaVersion: SCHEMA_VERSION,
    environment: configRuntime.environment,
    configSource: configRuntime.configSource,
    configuredEntryCount: Object.keys(configRuntime.entryMap || {}).length,
    collectAnswers,
    buildGooglePayload: () => Object.fromEntries(buildGooglePayload(collectAnswers())),
    visibleStepKeys: () => visibleSteps().map((step) => step.dataset.step),
  };
})();
