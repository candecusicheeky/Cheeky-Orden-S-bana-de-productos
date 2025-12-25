
import { XmlProduct, CsvProduct, ProductVariant, SortingRules, SortLogic, RowRule, MediaType, Age, Gender } from '../types';

export const defaultProductSort = (a: ProductVariant, b: ProductVariant) => {
    const dateA = a.newInDate?.getTime() || 0;
    const dateB = b.newInDate?.getTime() || 0;
    if (dateB !== dateA) return dateB - dateA;
    if (a.rankingAnalytics !== b.rankingAnalytics) return a.rankingAnalytics - b.rankingAnalytics;
    if (b.stockEcommerce !== a.stockEcommerce) return b.stockEcommerce - a.stockEcommerce;
    return 0;
};

export const interleaveRowX4 = (pool: ProductVariant[], usedIds: Set<string>, slotTypes: string[]): ProductVariant[] => {
    const row: ProductVariant[] = [];
    let hasSpecialMedia = false; 
    
    const isSpecialMedia = (type: MediaType) => 
        type === MediaType.CAMPAIGN || type === MediaType.MODEL || type === MediaType.VIDEO;

    const pick = (candidates: ProductVariant[], sortFn: (a: ProductVariant, b: ProductVariant) => number, reasonBase: string, typeRestriction?: string) => {
        let filtered = candidates.filter(p => !usedIds.has(p.id));
        
        if (hasSpecialMedia) {
            filtered = filtered.filter(p => !isSpecialMedia(p.mediaType));
        }

        if (typeRestriction) {
            const tr = typeRestriction.toUpperCase();
            const exactMatch = filtered.filter(p => p.tipoPrenda.toUpperCase() === tr);
            if (exactMatch.length > 0) filtered = exactMatch;
            else filtered = filtered.filter(p => p.tipoPrenda.toUpperCase().includes(tr) || tr.includes(p.tipoPrenda.toUpperCase()));
        }

        const sorted = filtered.sort(sortFn);
        if (sorted.length > 0) {
            const p = sorted[0];
            if (isSpecialMedia(p.mediaType)) {
                hasSpecialMedia = true;
            }
            let reason = reasonBase;
            if (reasonBase === 'FOTO') {
                if (p.mediaType === MediaType.CAMPAIGN) reason = `FOTO CAMPAÑA: ${p.campaignName || 'General'}`;
                else if (p.mediaType === MediaType.MODEL) reason = `FOTO MODELO`;
                else reason = `FOTO PRODUCTO`;
            }
            return { ...p, sortReason: reason };
        }
        return null;
    };

    const s1 = pick(pool, (a, b) => (b.newInDate?.getTime() || 0) - (a.newInDate?.getTime() || 0), 'NEW IN', slotTypes[0]);
    if (s1) { row.push(s1); usedIds.add(s1.id); }

    const s2 = pick(pool, (a, b) => a.rankingAnalytics - b.rankingAnalytics, 'RANKING ANALYTICS', slotTypes[1]);
    if (s2) { row.push(s2); usedIds.add(s2.id); }

    const s3 = pick(pool, (a, b) => {
        const score = { [MediaType.CAMPAIGN]: 3, [MediaType.MODEL]: 2, [MediaType.VIDEO]: 1, [MediaType.PRODUCT]: 0 };
        if (score[b.mediaType] !== score[a.mediaType]) return score[b.mediaType] - score[a.mediaType];
        return a.rankingAnalytics - b.rankingAnalytics;
    }, 'FOTO', slotTypes[2]);
    if (s3) { row.push(s3); usedIds.add(s3.id); }

    const s4 = pick(pool, (a, b) => b.stockEcommerce - a.stockEcommerce, 'STOCK ECOMMERCE', slotTypes[3]);
    if (s4) { row.push(s4); usedIds.add(s4.id); }

    while (row.length < 4) {
        const fallback = pick(pool, defaultProductSort, 'COMPLEMENTO');
        if (fallback) {
            row.push(fallback);
            usedIds.add(fallback.id);
        } else break;
    }
    return row;
};

export const sortProducts = (products: ProductVariant[], rules: SortingRules, excludedTypes: string[], basicSkus: string[]): ProductVariant[] => {
    const exSet = new Set(excludedTypes.map(e => e.trim().toUpperCase()));
    const basicSet = new Set(basicSkus.map(k => k.trim().toUpperCase()));
    
    const validPool: ProductVariant[] = [];
    const basicPool: ProductVariant[] = [];
    const excludedPool: ProductVariant[] = [];
    const invalidPool: ProductVariant[] = [];

    for (const p of products) {
        const pType = p.tipoPrenda.trim().toUpperCase();
        const pSku = p.grupoSku.trim().toUpperCase();
        const pCodigo = p.codigoComercial.trim().toUpperCase();

        if (exSet.has(pType)) {
            excludedPool.push(p);
        } else if (basicSet.has(pSku) || basicSet.has(pCodigo)) {
            basicPool.push(p);
        } else if (!p.hasStock || !p.hasPrice || !p.hasImage || !p.imageLink) {
            invalidPool.push(p);
        } else {
            validPool.push(p);
        }
    }

    const usedIds = new Set<string>();
    const finalResult: ProductVariant[] = [];
    const activeRules = rules.rowSequencing.length > 0 ? rules.rowSequencing : [{ id: 'default', age: '', gender: '', productTypes: [] } as RowRule];

    let cycleIndex = 0;
    let stuckCounter = 0;

    while (usedIds.size < validPool.length && stuckCounter < activeRules.length) {
        const rule = activeRules[cycleIndex % activeRules.length];
        const ruleTypes = rule.productTypes?.[0]?.split(/[,;]/).map(s => s.trim().toUpperCase()).filter(Boolean) || [];

        const filteredByAgeGender = validPool.filter(p => {
            const matchesAge = !rule.age || p.edad.trim().toUpperCase() === rule.age.toUpperCase();
            const matchesGender = !rule.gender || p.genero.trim().toUpperCase() === rule.gender.toUpperCase();
            return matchesAge && matchesGender;
        });

        const row = interleaveRowX4(filteredByAgeGender, usedIds, ruleTypes);
        if (row.length > 0) {
            finalResult.push(...row);
            stuckCounter = 0;
        } else {
            stuckCounter++; 
        }
        cycleIndex++;
    }

    const remaining = validPool.filter(p => !usedIds.has(p.id));
    while (usedIds.size < validPool.length) {
        const row = interleaveRowX4(remaining, usedIds, []);
        if (row.length > 0) finalResult.push(...row);
        else break;
    }

    return [...finalResult, ...basicPool, ...invalidPool, ...excludedPool];
};

export const parseXML = async (file: File): Promise<XmlProduct[]> => {
    const text = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    const items = Array.from(xmlDoc.querySelectorAll("item"));
    return items.map(item => {
        const imageLink = item.querySelector("image_link")?.textContent ?? '';
        const fileName = imageLink.split('/').pop() ?? '';
        const codePart = fileName.split('_')[0] ?? '';
        return {
            id: item.querySelector("id")?.textContent ?? '',
            title: item.querySelector("title")?.textContent ?? '',
            description: item.querySelector("description")?.textContent ?? '',
            imageLink,
            grupoSku: codePart.substring(0, 10),
            codigoComercial: codePart.substring(0, 8),
        };
    }).filter(p => p.grupoSku);
};

export const parseCSV = async (file: File): Promise<{ headers: string[], data: CsvProduct[] }> => {
    const text = await file.text();
    const rows = text.split(/\r?\n/).filter(row => row.trim());
    if (rows.length < 2) return { headers: [], data: [] };
    
    const parseCsvRow = (row: string): string[] => {
      const fields = [];
      let currentField = '';
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (inQuotes) {
          if (char === '"') {
            if (i + 1 < row.length && row[i + 1] === '"') { currentField += '"'; i++; } else { inQuotes = false; }
          } else { currentField += char; }
        } else {
          if (char === '"') { inQuotes = true; } else if (char === ',') { fields.push(currentField); currentField = ''; } else { currentField += char; }
        }
      }
      fields.push(currentField);
      return fields;
    };

    const header = parseCsvRow(rows[0]).map(h => h.trim());
    const data = rows.slice(1).map(rowStr => {
        const values = parseCsvRow(rowStr).map(v => v.trim());
        if (values.length !== header.length) return null;
        const rowObject: any = {};
        header.forEach((h, i) => { rowObject[h] = values[i] ?? ''; });
        return {
            ...rowObject,
            'Ranking Analytics': parseInt(rowObject['Ranking Analytics'], 10) || 9999,
            'Rankign Locales': parseInt(rowObject['Ranking Locales'] || rowObject['Rankign Locales'], 10) || 9999,
            'STOCK ECOMMERCE': parseInt(rowObject['STOCK ECOMMERCE'], 10) || 0,
            'STOCK LOCALES': parseInt(rowObject['STOCK LOCALES'], 10) || 0,
            'PRICE_CENTS': parseInt(rowObject['PRICE_CENTS'], 10) || 0,
            'IMAGEN CARGADA': (rowObject['IMAGEN CARGADA'] || '').toUpperCase().includes('SI') ? 'SI' : 'NO'
        } as CsvProduct;
    }).filter((row): row is CsvProduct => row !== null);
    return { headers: header, data };
};

export const synchronizeAndFilterData = (xmlProducts: XmlProduct[], csvProducts: CsvProduct[]): ProductVariant[] => {
    const xmlMap = new Map<string, XmlProduct>(xmlProducts.map(p => [p.id, p]));
    const aggregated = new Map<string, CsvProduct[]>();
    for (const row of csvProducts) {
        const sku = row['Grupo (Fórmula)']?.replace(/%/g, '');
        if (!sku) continue;
        if (!aggregated.has(sku)) aggregated.set(sku, []);
        aggregated.get(sku)?.push(row);
    }
    return Array.from(aggregated.entries()).map(([sku, rows]) => {
        const rep = rows[0];
        const hasStock = rows.some(r => r['STOCK ECOMMERCE'] > 0 || r['STOCK LOCALES'] > 0);
        const hasPrice = rows.some(r => (r['PRICE_CENTS'] ?? 0) > 0);
        const hasImage = rep['IMAGEN CARGADA'] === 'SI';
        let xml = Array.from(xmlMap.values()).find(x => x.grupoSku === sku);
        
        let mediaType = MediaType.PRODUCT;
        let campaignName = undefined;
        if (rep['FOTO CAMPAÑA'] && rep['FOTO CAMPAÑA'] !== '#N/A') {
            mediaType = MediaType.CAMPAIGN;
            campaignName = rep['FOTO CAMPAÑA'];
        }
        else if (rep['FOTO MODELO'] && rep['FOTO MODELO'] !== '#N/A') mediaType = MediaType.MODEL;
        else if (rep['VIDEO'] && rep['VIDEO'] !== '#N/A') mediaType = MediaType.VIDEO;

        return {
            id: sku,
            title: rep['TITULO'] || 'Sin Título',
            description: xml?.description ?? '',
            imageLink: xml?.imageLink ?? '',
            codigoComercial: rep['Codigo Comercial'] || '',
            grupoSku: sku,
            color: rep['COLOR'] || '',
            talles: [...new Set(rows.map(r => r['TALLE']))].filter(Boolean).sort(),
            tipoPrenda: rep['Tipo Prenda'] || '',
            edad: rep['Edad'] || '',
            genero: rep['Género'] || '',
            stockEcommerce: rows.reduce((s, r) => s + r['STOCK ECOMMERCE'], 0),
            stockLocales: rows.reduce((s, r) => s + r['STOCK LOCALES'], 0),
            rankingAnalytics: rep['Ranking Analytics'],
            rankingLocales: rep['Rankign Locales'],
            newInDate: rep['NEW IN'] && rep['NEW IN'] !== '#N/A' ? new Date(rep['NEW IN'].split('/').reverse().join('-')) : null,
            mediaType,
            campaignName,
            hasStock,
            hasPrice,
            hasImage,
            normalizedColor: '',
            normalizedType: '',
            vibe: ''
        };
    });
};

export const matchFilesToProducts = (files: File[], products: ProductVariant[]): ProductVariant[] => {
    const nextProducts = [...products];
    for (const file of files) {
        const fileNameWithExt = file.name.toUpperCase();
        const fileName = fileNameWithExt.split('.')[0];
        const normalizedFileName = fileName.replace(/%|_5|_1/g, '');
        const productIdx = nextProducts.findIndex(p => p.grupoSku.replace(/%/g, '').toUpperCase() === normalizedFileName || p.codigoComercial.toUpperCase() === normalizedFileName);
        if (productIdx > -1) {
            const isVideo = file.type.includes('video') || ['.mp4', '.m4a', '.mov', '.webm'].some(ext => fileNameWithExt.toLowerCase().endsWith(ext));
            nextProducts[productIdx] = {
                ...nextProducts[productIdx],
                imageLink: URL.createObjectURL(file),
                mediaType: isVideo ? MediaType.VIDEO : nextProducts[productIdx].mediaType,
                hasImage: true
            };
        }
    }
    return nextProducts;
};
