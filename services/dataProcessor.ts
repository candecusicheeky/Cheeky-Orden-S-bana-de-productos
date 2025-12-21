
import { XmlProduct, CsvProduct, ProductVariant, SortingRules, SortLogic, RowRule, MediaType, Age, Gender } from '../types';

// --- HELPER FUNCTIONS (Moved up for usage in Sync) ---

const normalizeColor = (color: string): string => {
    if (!color) return 'UNKNOWN';
    const c = color.toUpperCase();
    
    // Neutrals
    if (c.includes('BLANCO') || c.includes('WHITE') || c.includes('CRUDO') || c.includes('MARFIL') || c.includes('NATURAL')) return 'NEUTRAL_LIGHT';
    if (c.includes('NEGRO') || c.includes('BLACK') || c.includes('GRIS') || c.includes('GREY') || c.includes('MELANGE') || c.includes('ACERO')) return 'NEUTRAL_DARK';
    if (c.includes('JEAN') || c.includes('DENIM') || c.includes('INDIGO')) return 'DENIM';
    
    // Color Families
    if (c.includes('AZUL') || c.includes('BLUE') || c.includes('MARINO') || c.includes('CELESTE') || c.includes('PETROLEO')) return 'BLUE';
    if (c.includes('ROSA') || c.includes('PINK') || c.includes('FUCSIA') || c.includes('SALMON') || c.includes('MAGENTA')) return 'PINK';
    if (c.includes('ROJO') || c.includes('RED') || c.includes('BORDO') || c.includes('RUBI')) return 'RED';
    if (c.includes('VERDE') || c.includes('GREEN') || c.includes('OLIVA') || c.includes('MILITAR') || c.includes('LIMA') || c.includes('ESMERALDA')) return 'GREEN';
    if (c.includes('AMARILLO') || c.includes('YELLOW') || c.includes('MOSTAZA') || c.includes('OCRE')) return 'YELLOW';
    if (c.includes('BEIGE') || c.includes('ARENA') || c.includes('CAMEL') || c.includes('MARRON') || c.includes('TOSTADO') || c.includes('CHOCOLATE')) return 'EARTH';
    if (c.includes('VIOLETA') || c.includes('LILA') || c.includes('PURPURA') || c.includes('UVA')) return 'PURPLE';
    if (c.includes('NARANJA') || c.includes('ORANGE') || c.includes('CORAL')) return 'ORANGE';
    if (c.includes('FLUOR') || c.includes('NEON')) return 'NEON';
    
    return 'OTHER';
};

const normalizeType = (type: string): string => {
    if (!type) return 'OTHER';
    const t = type.toUpperCase();
    if (t.includes('REMERA') || t.includes('BUZO') || t.includes('CAMISA') || t.includes('CHOMBA') || t.includes('TOP') || t.includes('CARDIGAN') || t.includes('SWAETER') || t.includes('SWEATER') || t.includes('POLERA') || t.includes('MUSCULOSA')) return 'TOP';
    if (t.includes('PANTALON') || t.includes('JEAN') || t.includes('SHORT') || t.includes('POLLERA') || t.includes('CALZA') || t.includes('BERMUDA') || t.includes('JOGGING') || t.includes('FALDA')) return 'BOTTOM';
    if (t.includes('VESTIDO') || t.includes('ENTERITO') || t.includes('JARDINERO') || t.includes('MONO')) return 'FULL_BODY';
    if (t.includes('CAMPERA') || t.includes('CHALECO') || t.includes('SACO') || t.includes('MONTGO') || t.includes('ABRIGO') || t.includes('PARKA')) return 'OUTERWEAR';
    if (t.includes('ZAPATILLA') || t.includes('SANDALIA') || t.includes('OJOTA') || t.includes('BOTA') || t.includes('CALZADO') || t.includes('GUILLERMINA')) return 'SHOES';
    return 'ACCESSORY';
};

const detectVibe = (title: string, type: string): string => {
    const allText = (title + ' ' + type).toUpperCase();

    // 1. FORMAL / ELEGANT
    if (allText.includes('LINO') || allText.includes('FIESTA') || allText.includes('SEDA') || 
        allText.includes('VOILE') || allText.includes('VESTIR') || allText.includes('GASA') || 
        allText.includes('ENCAJE') || allText.includes('PUNTILLA') || allText.includes('SATEEN')) {
        return 'FORMAL';
    }

    // 2. BEACH / SUMMER FUN
    if (allText.includes('SUNNY') || allText.includes('PLAYA') || allText.includes('OJOTA') || 
        allText.includes('MALLA') || allText.includes('BIKINI') || allText.includes('SHORTS DE BAÑO') || 
        allText.includes('TRAJE DE BAÑO') || allText.includes('FLUOR') || allText.includes('NEON') || 
        allText.includes('TOALLA') || allText.includes('LONITA')) {
        return 'BEACH';
    }

    // 3. SPORT / CASUAL SPORT
    if (allText.includes('DEPORT') || allText.includes('JOGGING') || allText.includes('RUSTICO') || 
        allText.includes('ACTIVE') || allText.includes('ALGODON') || allText.includes('BÁSICO') || 
        allText.includes('BASICO') || allText.includes('SPORT')) {
        return 'CASUAL_SPORT';
    }
    
    return 'CASUAL_CHIC'; // Default / Versatile
}

export const parseXML = async (file: File): Promise<XmlProduct[]> => {
    const text = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    const items = Array.from(xmlDoc.querySelectorAll("item"));
    
    return items.map(item => {
        const title = item.querySelector("title")?.textContent ?? '';
        const imageLink = item.querySelector("image_link")?.textContent ?? '';
        
        // Extract Grupo Sku (10 chars) and Codigo Comercial (8 chars) from image_link
        const urlParts = imageLink.split('/');
        const fileName = urlParts[urlParts.length - 1] ?? '';
        const codePart = fileName.split('_')[0] ?? '';
        
        const grupoSku = codePart.substring(0, 10);
        const codigoComercial = codePart.substring(0, 8);

        return {
            id: item.querySelector("id")?.textContent ?? '',
            title: title,
            description: item.querySelector("description")?.textContent ?? '',
            imageLink: imageLink,
            grupoSku: grupoSku,
            codigoComercial: codigoComercial,
        };
    }).filter(p => p.grupoSku);
};

const parseCsvRow = (row: string): string[] => {
  const fields = [];
  let currentField = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < row.length && row[i + 1] === '"') {
          currentField += '"';
          i++; 
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }
  fields.push(currentField);
  return fields;
};

export const parseCSV = async (file: File): Promise<{ headers: string[], data: CsvProduct[] }> => {
    const text = await file.text();
    const rows = text.split(/\r?\n/).filter(row => row.trim());
    if (rows.length < 2) return { headers: [], data: [] };

    const header = parseCsvRow(rows[0]).map(h => h.trim());
    const dataRows = rows.slice(1);

    const data = dataRows.map(rowStr => {
        const values = parseCsvRow(rowStr).map(v => v.trim());

        if (values.length !== header.length) {
            return null;
        }

        const rowObject: any = {};
        header.forEach((h, i) => {
            rowObject[h] = values[i] ?? '';
        });

        const rankingLocalesRaw = rowObject['Ranking Locales'] || rowObject['Rankign Locales'];
        
        return {
            ...rowObject,
            'Ranking Analytics': parseInt(rowObject['Ranking Analytics'], 10) || 9999,
            'Rankign Locales': parseInt(rankingLocalesRaw, 10) || 9999,
            'STOCK ECOMMERCE': parseInt(rowObject['STOCK ECOMMERCE'], 10) || 0,
            'STOCK LOCALES': parseInt(rowObject['STOCK LOCALES'], 10) || 0,
            'PRICE_CENTS': parseInt(rowObject['PRICE_CENTS'], 10) || 0,
        } as CsvProduct;
    }).filter((row): row is CsvProduct => row !== null);
    
    return { headers: header, data };
};


const parseNewInDate = (dateStr?: string): Date | null => {
    if (!dateStr || dateStr === '#N/A') return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return null;
};

const identifyFamilyName = (title: string, tipoPrenda: string): string | undefined => {
    const stopWords = ['DE', 'Y', 'A', 'CON', 'LA', 'EL', 'LOS', 'LAS', 'UN', 'UNA', tipoPrenda.toUpperCase()];
    const words = title.toUpperCase().split(' ').filter(word => !stopWords.includes(word) && isNaN(Number(word)) && word.length > 2);
    return words.length > 0 ? words[words.length - 1] : undefined;
}

export const synchronizeAndFilterData = (
    xmlProducts: XmlProduct[], 
    csvProducts: CsvProduct[]
): ProductVariant[] => {
    const xmlMap = new Map<string, XmlProduct>(xmlProducts.map(p => [p.grupoSku, p]));
    
    const aggregatedByGrupoSku = new Map<string, CsvProduct[]>();

    for (const csvProduct of csvProducts) {
        const grupoSkuValue = csvProduct['Grupo (Fórmula)'];
        if (!grupoSkuValue) continue;

        const grupoSku = grupoSkuValue.replace(/%/g, '');
        if (!grupoSku) continue;
        
        if (!aggregatedByGrupoSku.has(grupoSku)) {
            aggregatedByGrupoSku.set(grupoSku, []);
        }
        aggregatedByGrupoSku.get(grupoSku)?.push(csvProduct);
    }
    
    const allVariants: ProductVariant[] = [];

    for (const [grupoSku, csvRows] of aggregatedByGrupoSku.entries()) {
        const representativeRow = csvRows[0];
        if (!representativeRow) continue;

        const xmlProduct = xmlMap.get(grupoSku);

        const hasStock = csvRows.some(row => row['STOCK ECOMMERCE'] > 0 || row['STOCK LOCALES'] > 0);
        const hasPrice = csvRows.some(row => (row['PRICE_CENTS'] ?? 0) > 0);
        
        const talles = [...new Set(csvRows.map(r => r['TALLE'] || ''))].filter(t => t).sort();
        const totalStockEcommerce = csvRows.reduce((sum, r) => sum + r['STOCK ECOMMERCE'], 0);
        const totalStockLocales = csvRows.reduce((sum, r) => sum + r['STOCK LOCALES'], 0);
        
        const fotoCampana = representativeRow['FOTO CAMPAÑA'];
        const fotoModelo = representativeRow['FOTO MODELO'];
        const video = representativeRow['VIDEO'];

        let mediaType: MediaType;
        let campaignName: string | undefined = undefined;

        if (fotoCampana && fotoCampana !== '#N/A') {
            mediaType = MediaType.CAMPAIGN;
            campaignName = fotoCampana;
        } else if (fotoModelo && fotoModelo !== '#N/A') {
            mediaType = MediaType.MODEL;
        } else if (video && video !== '#N/A') {
            mediaType = MediaType.VIDEO;
        } else {
            mediaType = MediaType.PRODUCT;
        }
        
        const title = representativeRow['TITULO'] || 'Sin Título';
        const tipoPrenda = representativeRow['Tipo Prenda'] || 'Sin Tipo';
        const edad = representativeRow['Edad'] || 'Sin Edad';
        const genero = representativeRow['Género'] || 'Sin Género';
        const color = representativeRow['COLOR'] || 'Sin Color';
        const codigoComercial = representativeRow['Codigo Comercial'] || '';

        // Pre-calculate fields for performance
        const normalizedColor = normalizeColor(color);
        const normalizedType = normalizeType(tipoPrenda);
        const vibe = detectVibe(title, tipoPrenda);

        allVariants.push({
            id: grupoSku,
            title: title,
            description: xmlProduct?.description ?? '',
            imageLink: xmlProduct?.imageLink ?? '', 
            codigoComercial: codigoComercial,
            grupoSku: grupoSku,
            color: color,
            talles,
            tipoPrenda: tipoPrenda,
            edad: edad,
            genero: genero,
            stockEcommerce: totalStockEcommerce,
            stockLocales: totalStockLocales,
            rankingAnalytics: representativeRow['Ranking Analytics'],
            rankingLocales: representativeRow['Rankign Locales'],
            newInDate: parseNewInDate(representativeRow['NEW IN']),
            familyName: identifyFamilyName(title, tipoPrenda),
            mediaType,
            campaignName,
            hasStock,
            hasPrice,
            // Optimized fields
            normalizedColor,
            normalizedType,
            vibe
        });
    }

    return allVariants;
};

const baseSort = (a: ProductVariant, b: ProductVariant): number => {
    // 1. Mayor Stock Ecommerce (desc)
    if (b.stockEcommerce !== a.stockEcommerce) return b.stockEcommerce - a.stockEcommerce;
    
    // 2. Ranking Analytics (asc)
    if (a.rankingAnalytics !== b.rankingAnalytics) return a.rankingAnalytics - b.rankingAnalytics;
    
    // 3. Ranking Locales (asc)
    if (a.rankingLocales !== b.rankingLocales) return a.rankingLocales - b.rankingLocales;

    // 4. New In (desc)
    if (a.newInDate && b.newInDate) {
        if (b.newInDate.getTime() !== a.newInDate.getTime()) return b.newInDate.getTime() - a.newInDate.getTime();
    } else if (a.newInDate) return -1;
    else if (b.newInDate) return 1;

    // 5. Mayor Stock Locales (desc)
    if (b.stockLocales !== a.stockLocales) return b.stockLocales - a.stockLocales;
    
    return 0;
};

// Helper to identify items that count towards "Visual Noise"
const isVisualMedia = (p: ProductVariant): boolean => {
    return p.mediaType === MediaType.VIDEO || 
           p.mediaType === MediaType.CAMPAIGN || 
           p.mediaType === MediaType.MODEL;
};

// Strictly validates if a candidate product can be placed in the current row based on Visual/Rhythm rules
const checkStrictVisualConstraints = (currentRowItems: ProductVariant[], candidate: ProductVariant): boolean => {
    const isCandidateVisual = isVisualMedia(candidate);

    // Regular products are always allowed visually (unless demographic/vibe rules fail later)
    if (!isCandidateVisual) return true; 

    // 1. SPACING RULE: NEVER ADJACENT (Intercalated)
    // Check the immediately preceding item
    if (currentRowItems.length > 0) {
        const lastItem = currentRowItems[currentRowItems.length - 1];
        if (isVisualMedia(lastItem)) {
            // If the last one was visual, this one CANNOT be visual.
            // We need a "buffer" product in between.
            return false; 
        }
    }

    // 2. QUANTITY RULE: MAX 2 VISUALS PER ROW
    // Count how many visuals are already in this row
    const visualCount = currentRowItems.filter(p => isVisualMedia(p)).length;
    if (visualCount >= 2) {
        return false; // Quota exceeded
    }

    // 3. CAMPAIGN CONSISTENCY RULE
    // If there is already a Campaign photo in this row, the new candidate (if it is a campaign)
    // MUST be from the exact same campaign name.
    if (candidate.mediaType === MediaType.CAMPAIGN) {
        const existingCampaign = currentRowItems.find(p => p.mediaType === MediaType.CAMPAIGN);
        if (existingCampaign) {
            // Ensure consistency
            if (existingCampaign.campaignName !== candidate.campaignName) {
                return false;
            }
        }
    }

    // 4. VIDEO EXCLUSIVITY (Keep existing rule: Only 1 video per row, though Max 2 Visuals covers most of this, we prefer variety)
    if (candidate.mediaType === MediaType.VIDEO) {
        const hasVideo = currentRowItems.some(p => p.mediaType === MediaType.VIDEO);
        if (hasVideo) return false;
    }

    return true;
};

// Calculates score for strict Visual/Style Cohesion
const calculateVisualHarmonyScore = (currentRowItems: ProductVariant[], candidate: ProductVariant, isLowPriority: boolean): number => {
    let score = 0;

    // --- VIBE CHECK (Strict Thematic enforcement) ---
    if (currentRowItems.length > 0) {
        const mainVibe = currentRowItems[0].vibe; // Row leader determines the vibe
        const candidateVibe = candidate.vibe;

        if (mainVibe !== 'CASUAL_CHIC') {
            // If row is strongly themed (Formal/Beach/Sport), we enforce it strictly.
            if (mainVibe !== candidateVibe && candidateVibe !== 'CASUAL_CHIC') {
                // Penalize clashing specific themes heavily (e.g. Beach vs Formal)
                score -= 10000; 
            } else if (mainVibe === candidateVibe) {
                score += 2000; // Bonus for continuing the theme
            }
        } else {
            // If row started versatile (Casual Chic), be careful introducing strong themes later
            if (candidateVibe !== 'CASUAL_CHIC') {
                 // Don't bring a Bikini into a casual street-wear row mid-way if possible
                 score -= 1000;
            }
        }
    } else {
        // New Row Starters
        // Prefer starting rows with strong "Vibes" if available to create distinct sections
        if (candidate.vibe !== 'CASUAL_CHIC') score += 500;
    }

    // --- COLOR HARMONY ---
    const candidateColor = candidate.normalizedColor;
    const isNeutral = candidateColor === 'NEUTRAL_LIGHT' || candidateColor === 'NEUTRAL_DARK' || candidateColor === 'DENIM';
    
    const rowColors = currentRowItems.map(p => p.normalizedColor);
    const dominantColor = rowColors.find(c => c !== 'NEUTRAL_LIGHT' && c !== 'NEUTRAL_DARK' && c !== 'DENIM' && c !== 'UNKNOWN');
    
    if (dominantColor) {
        if (candidateColor === dominantColor) {
            score += 3000; // Massive Bonus: Create a color block
        } else if (isNeutral) {
            score += 500; // Safe: Add neutral to color block
        } else {
            score -= 5000; // Clash: Don't mix two different strong colors (e.g. Red next to Green)
        }
    } else {
        // Row is currently all neutral or empty
        if (!isNeutral && candidateColor !== 'UNKNOWN') {
             score += 1000; // Start a color story
        }
    }

    // --- CAMPAIGN MATCH BONUS ---
    // If we passed strict checks, give a bonus for matching campaign names to ensure they get picked
    if (candidate.mediaType === MediaType.CAMPAIGN && currentRowItems.some(p => p.campaignName === candidate.campaignName)) {
        score += 5000;
    }

    // --- TYPE DIVERSITY ---
    // This is for general visual interest, but updated logic below handles strict adjacency better.
    const rowTypes = currentRowItems.map(p => p.normalizedType);
    const candidateType = candidate.normalizedType;
    
    // Outfit Logic: Top -> Bottom -> Shoes -> Outerwear
    if (candidateType === 'TOP' && rowTypes.includes('BOTTOM')) score += 1000;
    if (candidateType === 'BOTTOM' && rowTypes.includes('TOP')) score += 1000;
    if (candidateType === 'SHOES' && (rowTypes.includes('TOP') || rowTypes.includes('FULL_BODY'))) score += 800;
    
    // Low Priority Penalty
    if (isLowPriority) score -= 50000;

    return score;
};

const getAgeProximityScore = (targetAge: string, candidateAge: string): number => {
    if (!targetAge || !candidateAge) return 0;
    if (targetAge === candidateAge) return 5000; // Exact Match

    // Adjacent logic
    // BEBE <-> TODDLER <-> KIDS
    if (targetAge === Age.BEBE) {
        if (candidateAge === Age.TODDLER) return 2000;
        if (candidateAge === Age.KIDS) return 500; // Far
    }
    if (targetAge === Age.TODDLER) {
        if (candidateAge === Age.BEBE) return 2000;
        if (candidateAge === Age.KIDS) return 2000;
    }
    if (targetAge === Age.KIDS) {
        if (candidateAge === Age.TODDLER) return 2000;
        if (candidateAge === Age.BEBE) return 500; // Far
    }
    return 0;
};

const getDemographicScore = (
    ruleAge: Age | '', 
    ruleGender: Gender | '', 
    candidate: ProductVariant
): number => {
    let score = 0;

    // 1. AGE SCORING (Waterfall)
    if (ruleAge) {
        score += getAgeProximityScore(ruleAge, candidate.edad);
    } else {
        score += 2000; // No age rule, everything is fine
    }

    // 2. GENDER SCORING (Waterfall)
    // Rule: Gender Match > Unisex > Wrong Gender
    const cGender = candidate.genero;
    const isUnisex = cGender === Gender.UNISEX || ruleGender === Gender.UNISEX;
    const isGenderMatch = !ruleGender || ruleGender === cGender;

    if (isGenderMatch) {
        score += 3000; 
    } else if (isUnisex) {
        score += 1500; // Unisex is a good fallback
    } else {
        score -= 10000; // Wrong gender (e.g. Boys in Girls row)
    }

    return score;
};

const getStrategicMediaScore = (
    candidate: ProductVariant,
    colIndex: number,
    lastHeroRowIndex: number,
    currentRowIndex: number
): number => {
    let score = 0;
    const isHeroMedia = candidate.mediaType === MediaType.VIDEO || candidate.mediaType === MediaType.CAMPAIGN;

    // STRATEGIC PLACEMENT:
    // We want Videos/Campaigns primarily in Column 0 (The first thing seen on mobile in a LTR scan or top-left)
    // And we want them spaced out by at least 1 row to create rhythm.

    if (isHeroMedia) {
        // Spacing check: Has it been long enough since the last hero row?
        // If last hero was row 0, we are in row 1 (diff 1) -> Too close. 
        // If last hero was row 0, we are in row 2 (diff 2) -> OK.
        const rowsSinceLastHero = currentRowIndex - lastHeroRowIndex;

        if (colIndex === 0) {
            if (rowsSinceLastHero >= 2) {
                 // PERFECT SPOT: High priority injection
                 // Videos > Campaign in priority
                 score += (candidate.mediaType === MediaType.VIDEO ? 50000 : 45000);
            } else {
                // Too close to another hero, penalize to save it for later
                score -= 20000;
            }
        } else if (colIndex >= 2) {
            // If we are in column 2 or 3, and we haven't filled the quota of 2 visuals yet,
            // this is a good place to put the second visual element (intercalated)
            score += 5000; 
        } else {
            // Avoid middle columns if possible for the "Hero" shot, unless balancing
            score -= 5000;
        }
    }

    // MODEL PHOTOS:
    // Good fillers, prefer them over standard product shots if stock is good
    if (candidate.mediaType === MediaType.MODEL) {
        score += 2000; 
    }

    return score;
}

export const sortProducts = (
    products: ProductVariant[], 
    rules: SortingRules, 
    excludedProductTypes: string[], 
    lowPriorityKeywords: string[]
): ProductVariant[] => {
    
    const lowercasedExclusions = new Set(excludedProductTypes.map(t => t.toLowerCase()));
    const validLowPriorityKeywords = lowPriorityKeywords.filter(k => k.trim().length > 0).map(k => k.trim().toUpperCase());

    const sortableProducts: ProductVariant[] = [];
    const unsortableProducts: ProductVariant[] = [];
    const excludedProducts: ProductVariant[] = [];
    
    const lowPriorityIds = new Set<string>();

    for (const p of products) {
        if (lowercasedExclusions.has(p.tipoPrenda.toLowerCase())) {
            excludedProducts.push(p);
            continue;
        }
        if (!p.hasStock || !p.hasPrice || !p.imageLink) {
            unsortableProducts.push(p);
            continue;
        }
        
        sortableProducts.push(p);

        if (validLowPriorityKeywords.length > 0) {
            const titleUpper = p.title.toUpperCase();
            const isLow = validLowPriorityKeywords.some(kw => titleUpper.includes(kw));
            if (isLow) lowPriorityIds.add(p.id);
        }
    }
    
    unsortableProducts.sort((a, b) => a.title.localeCompare(b.title));

    // Sort pool by business logic initially
    let pool = sortableProducts;
    pool.sort((a, b) => {
        // 1. Low priority check
        const aLow = lowPriorityIds.has(a.id);
        const bLow = lowPriorityIds.has(b.id);
        if (aLow && !bLow) return 1;
        if (!aLow && bLow) return -1;

        // 2. Strategic Media Float (Video/Campaign)
        // We want them slightly accessible in the sort, not buried, but not forcing them #1 if stock is bad.
        // This helps the search window find them.
        const aHero = (a.mediaType === MediaType.VIDEO || a.mediaType === MediaType.CAMPAIGN) ? 1 : 0;
        const bHero = (b.mediaType === MediaType.VIDEO || b.mediaType === MediaType.CAMPAIGN) ? 1 : 0;
        
        if (aHero !== bHero) return bHero - aHero; // Bring heroes up slightly

        return baseSort(a, b);
    });
    
    let sortedProducts: ProductVariant[] = [];
    let rowIndex = 0;
    // Start with -2 so row 0 can have a hero immediately if available
    let lastHeroRowIndex = -2; 
    
    const maxProducts = pool.length;

    const effectiveRules = (rules && rules.rowSequencing && rules.rowSequencing.length > 0) 
        ? rules.rowSequencing 
        : [{ id: 'default', age: '' as any, gender: '' as any, productTypes: [] }]; 

    let usedProductIds = new Set<string>();

    while(sortedProducts.length < maxProducts) {
        if (rowIndex > maxProducts * 2) break;

        const rule = effectiveRules[rowIndex % effectiveRules.length];
        const productTypesInRule = rule.productTypes?.filter(pt => pt.trim() !== '') || [];
        
        let currentRowStart = Math.floor(sortedProducts.length / 4) * 4;
        let rowHasHero = false;

        for (let col = 0; col < 4; col++) {
            if (sortedProducts.length >= maxProducts) break;
            
            const currentRowItems = sortedProducts.slice(currentRowStart);
            const CANDIDATE_WINDOW_SIZE = 300; 
            
            // The specific type requested by the rule for this column
            const targetType = productTypesInRule[col];
            
            // Calculate Left Neighbor Category for Anti-Repetition Logic
            const leftNeighbor = currentRowItems.length > 0 ? currentRowItems[currentRowItems.length - 1] : null;
            const leftNeighborCategory = leftNeighbor ? leftNeighbor.normalizedType : null;

            let bestCandidate: ProductVariant | undefined = undefined;
            let bestScore = -Infinity;

            // PHASE 1: TRY EXACT MATCH (STRICT)
            // Look for the specific requested type (e.g., "POLLERA")
            if (targetType) {
                let candidatesChecked = 0;
                for (const candidate of pool) {
                    if (usedProductIds.has(candidate.id)) continue;
                    if (candidatesChecked >= CANDIDATE_WINDOW_SIZE && bestCandidate) break;

                    if (candidate.tipoPrenda.toLowerCase() !== targetType.toLowerCase()) continue;

                    candidatesChecked++;

                    // Strict Visuals
                    if (!checkStrictVisualConstraints(currentRowItems, candidate)) continue;

                    const demoScore = getDemographicScore(rule.age as Age, rule.gender as Gender, candidate);
                    const isLow = lowPriorityIds.has(candidate.id);
                    const visualScore = calculateVisualHarmonyScore(currentRowItems, candidate, isLow);
                    const mediaScore = getStrategicMediaScore(candidate, col, lastHeroRowIndex, rowIndex);
                    const businessScore = 500 - candidatesChecked; 

                    const totalScore = demoScore + visualScore + mediaScore + businessScore;

                    if (totalScore > bestScore) {
                        bestScore = totalScore;
                        bestCandidate = candidate;
                    }
                }
            }

            // PHASE 2: SMART COMPLEMENTARY FALLBACK
            // If Phase 1 failed (no exact match or no target defined) AND we have a rule/target
            if (!bestCandidate && targetType) {
                const intendedCategory = normalizeType(targetType);
                
                let candidatesChecked = 0;
                for (const candidate of pool) {
                    if (usedProductIds.has(candidate.id)) continue;
                    if (candidatesChecked >= CANDIDATE_WINDOW_SIZE && bestCandidate) break;

                    // 1. STRICT DEMOGRAPHICS (Must match age/gender of rule as per user request)
                    if (rule.age && candidate.edad !== rule.age) continue;
                    if (rule.gender && candidate.genero !== rule.gender) continue;

                    candidatesChecked++;

                    // 2. STRICT VISUALS
                    if (!checkStrictVisualConstraints(currentRowItems, candidate)) continue;

                    const candidateCategory = candidate.normalizedType;

                    // 3. ADJACENCY CHECK (Crucial: Do not repeat category of left neighbor)
                    // e.g. If left is Top, don't pick Top.
                    if (leftNeighborCategory && candidateCategory === leftNeighborCategory) continue;

                    // 4. COMPLEMENTARY SCORING
                    // Prefer same category as intended (Swap Bottom for Bottom)
                    let complementScore = 0;
                    if (candidateCategory === intendedCategory) {
                        complementScore = 5000; // Ideal replacement
                    } else {
                        // If intended was Bottom, but we can't find one (or it clashes), 
                        // accept different category (e.g. Full Body)
                        complementScore = 2000;
                    }

                    const isLow = lowPriorityIds.has(candidate.id);
                    // Use calculateVisualHarmonyScore but prioritize our complement logic
                    const visualScore = calculateVisualHarmonyScore(currentRowItems, candidate, isLow);
                    const businessScore = 500 - candidatesChecked;

                    const totalScore = complementScore + visualScore + businessScore;

                    if (totalScore > bestScore) {
                        bestScore = totalScore;
                        bestCandidate = candidate;
                    }
                }
            }

            // PHASE 3: GENERAL FALLBACK
            // If everything else failed (or no rule defined), just find something that fits visual rules
            if (!bestCandidate) {
                let candidatesChecked = 0;
                for (const candidate of pool) {
                    if (usedProductIds.has(candidate.id)) continue;
                    if (candidatesChecked > 100) break;
                    
                    candidatesChecked++;
                    
                    if (!checkStrictVisualConstraints(currentRowItems, candidate)) continue;

                    const demoScore = getDemographicScore(rule.age as Age, rule.gender as Gender, candidate);
                    const isLow = lowPriorityIds.has(candidate.id);
                    const visualScore = calculateVisualHarmonyScore(currentRowItems, candidate, isLow);
                    
                    // Penalize slightly to prefer targeted matches
                    const totalScore = demoScore + visualScore - 2000;

                    if (totalScore > bestScore) {
                        bestScore = totalScore;
                        bestCandidate = candidate;
                    }
                }
            }

            if (bestCandidate) {
                sortedProducts.push(bestCandidate);
                usedProductIds.add(bestCandidate.id);
                if (bestCandidate.mediaType === MediaType.VIDEO || bestCandidate.mediaType === MediaType.CAMPAIGN) {
                    rowHasHero = true;
                }
            }
        }
        
        if (rowHasHero) {
            lastHeroRowIndex = rowIndex;
        }
        rowIndex++;
    }
    
    const remaining = pool.filter(p => !usedProductIds.has(p.id));
    sortedProducts.push(...remaining);

    return [...sortedProducts, ...unsortableProducts, ...excludedProducts];
};
