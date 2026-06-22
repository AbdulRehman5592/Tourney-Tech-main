// 🌍 REGION LIST (UNCHANGED)
export const regionList = [
  "NY-NJ-DE",
  "PHIL / PA CITIES",
  "CT/MAS/NH/VT (NE)",
  "DMV / BALTIMORE",
  "7-Cities / Richmond",
  "Detroit",
  "Atlanta",
  "Birmingham",
  "Columbus",
  "Florida",
  "Cincinnati",
  "Chicago",
  "Dallas",
  "Austin",
  "Houston",
  "San Antonio",
  "New Orleans",
  "Los Angeles",
  "Las Vegas",
  "Other",
];

// 🌆 REGION → CITY (UNCHANGED)
export const regionCitiesMap = {
  "NY-NJ-DE": ["New York City", "Newark", "Wilmington"],
  "PHIL / PA CITIES": ["Philadelphia", "Pittsburgh", "Allentown"],
  "CT/MAS/NH/VT (NE)": ["Hartford", "Boston", "Concord", "Burlington"],
  "DMV / BALTIMORE": ["Washington DC", "Baltimore", "Arlington"],
  "7-Cities / Richmond": ["Norfolk", "Virginia Beach", "Richmond"],
  Detroit: ["Downtown", "Dearborn", "Southfield"],
  Atlanta: ["Downtown", "Midtown", "Buckhead"],
  Birmingham: ["Hoover", "Homewood", "Mountain Brook"],
  Columbus: ["Downtown", "Dublin", "Westerville"],
  Florida: ["Miami", "Orlando", "Tampa", "Jacksonville"],
  Cincinnati: ["Downtown", "Hyde Park", "Over-the-Rhine"],
  Chicago: ["Downtown", "Evanston", "Oak Park"],
  Dallas: ["Irving", "Plano", "Arlington"],
  Austin: ["Downtown", "Round Rock", "Cedar Park"],
  Houston: ["Sugar Land", "Katy", "The Woodlands"],
  "San Antonio": ["Downtown", "Alamo Heights", "Stone Oak"],
  "New Orleans": ["French Quarter", "Garden District", "Uptown"],
  "Los Angeles": ["Hollywood", "Santa Monica", "Burbank"],
  "Las Vegas": ["Summerlin", "Henderson", "Paradise"],
  Other: ["Other Region"],
};

// 🏙️ UK STATES (Constituent Countries + Major Counties)
export const stateList = [
  { isoCode: "ENG", name: "England" },
  { isoCode: "SCT", name: "Scotland" },
  { isoCode: "WLS", name: "Wales" },
  { isoCode: "NIR", name: "Northern Ireland" },

  // Major English counties (for detail)
  { isoCode: "LND", name: "Greater London" },
  { isoCode: "MAN", name: "Greater Manchester" },
  { isoCode: "YKS", name: "Yorkshire" },
  { isoCode: "WMID", name: "West Midlands" },
  { isoCode: "MER", name: "Merseyside" },
  { isoCode: "KNT", name: "Kent" },
  { isoCode: "ESS", name: "Essex" },
  { isoCode: "HRF", name: "Hertfordshire" },
  { isoCode: "SRY", name: "Surrey" },
];

// 🏙️ STATE → CITY MAP (UK)
export const stateCitiesMap = {
  // 🌆 England
  ENG: ["London", "Birmingham", "Manchester", "Liverpool", "Leeds", "Bristol", "Nottingham", "Sheffield", "Leicester", "Newcastle upon Tyne"],
  
  // 🏔️ Scotland
  SCT: ["Edinburgh", "Glasgow", "Aberdeen", "Dundee", "Inverness", "Stirling"],

  // 🏞️ Wales
  WLS: ["Cardiff", "Swansea", "Newport", "Wrexham", "Bangor"],

  // 🍀 Northern Ireland
  NIR: ["Belfast", "Derry", "Lisburn", "Newry"],

  // 🇬🇧 Major English counties
  LND: ["City of London", "Westminster", "Camden", "Croydon", "Ealing"],
  MAN: ["Manchester", "Salford", "Stockport", "Bolton", "Oldham"],
  YKS: ["Leeds", "Sheffield", "Bradford", "York", "Huddersfield"],
  WMID: ["Birmingham", "Wolverhampton", "Coventry", "Solihull", "Dudley"],
  MER: ["Liverpool", "Birkenhead", "St Helens", "Southport", "Bootle"],
  KNT: ["Maidstone", "Canterbury", "Dover", "Tunbridge Wells", "Ashford"],
  ESS: ["Chelmsford", "Colchester", "Southend-on-Sea", "Basildon", "Harlow"],
  HRF: ["Watford", "St Albans", "Stevenage", "Hemel Hempstead"],
  SRY: ["Guildford", "Woking", "Epsom", "Redhill", "Farnham"],
};

// 🏆 CLUB LIST (UNCHANGED)
export const clubList = [
  "7NO PLAYERS",
  "ALAMO 7NO",
  "AWC",
  "BEST OF THE WEST",
  "CAPITAL CITY CARD CLUB (C4)",
  "CINCINNATI WHIST GROUP (CWG)",
  "CLUB BID",
  "CWPS COLUMBUS WHIST PLAYERS SOCIETY",
  "DALLAS ROAD CREW",
  "DMV CARTEL",
  "DMV REGULATORS",
  "H-TOWN 7NO BID WHIST CLUB",
  "HEAVY HITTERS",
  "MIS DEALS",
  "MOTOR CITY WHIST MECHANICS",
  "SMOKIN ACES",
  "T.O.W.",
  "TRUMP TIGHT HOUSTON",
  "Other",
  "None",
];
