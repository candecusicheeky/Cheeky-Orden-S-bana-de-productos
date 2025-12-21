
import React, { useState, useCallback, useMemo, FC, useEffect, useRef } from 'react';
import { ProductVariant, SortingRules, SortLogic, Age, Gender, RowRule, MediaType, CsvProduct } from './types';
import { parseXML, parseCSV, synchronizeAndFilterData, sortProducts } from './services/dataProcessor';
import { HomeIcon, CriteriaIcon, InstructionsIcon, TrashIcon, ChevronDownIcon, ReplaceIcon, ImageIcon } from './components/icons';

type Page = 'inicio' | 'criterios' | 'instrucciones';

const INSTRUCTIONS_STORAGE_KEY = 'instructions_content';

const getDefaultInstructions = () => `
<div class="space-y-6 text-gray-800">
    <header class="border-b pb-4">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Guía Rápida: Herramienta de Orden de Sábana</h1>
        <p class="text-base text-gray-600">Esta herramienta te permite ordenar tus productos de manera estratégica para tu e-commerce, combinando datos de XML y CSV.</p>
    </header>

    <section>
        <h2 class="text-xl font-bold text-blue-800 mb-3">Paso 1: Carga tus Archivos</h2>
        <ol class="list-decimal pl-5 space-y-2 text-gray-700 font-medium">
            <li><span class="font-bold text-gray-900">Sube el Archivo XML:</span> Contiene la información base (descripciones, links de imágenes).</li>
            <li><span class="font-bold text-gray-900">Sube el Archivo CSV:</span> Contiene datos de stock, precios y rankings.</li>
            <li><span class="font-bold text-gray-900">Presiona "Procesar":</span> Para combinar y validar los datos.</li>
        </ol>
    </section>

    <section>
        <h2 class="text-xl font-bold text-blue-800 mb-3">Paso 3: Criterios y Exportación</h2>
        <ul class="list-disc pl-5 space-y-2 text-gray-700">
            <li>Define <strong>Criterios de Orden</strong> en la pestaña correspondiente.</li>
            <li>Visualiza la grilla en <strong>Inicio</strong> y arrastra productos para ajustes finos.</li>
            <li>Al finalizar, <strong>Exporta el CSV</strong>.</li>
        </ul>
    </section>
</div>
`;

const Sidebar: FC<{ currentPage: Page; onNavigate: (page: Page) => void }> = ({ currentPage, onNavigate }) => {
    const navItems = [
        { id: 'inicio' as Page, label: 'Inicio', icon: <HomeIcon /> },
        { id: 'criterios' as Page, label: 'Criterios de orden', icon: <CriteriaIcon /> },
        { id: 'instrucciones' as Page, label: 'Instrucciones (Doc)', icon: <InstructionsIcon /> },
    ];

    return (
        <aside className="hidden min-[750px]:flex w-64 bg-white p-6 flex-shrink-0 rounded-l-2xl border-r border-gray-200 flex-col">
            <div className="mb-8">
                <h1 className="text-xl font-bold">Cheeky</h1>
                <h2 className="text-sm text-gray-600 font-medium">Orden Sábana</h2>
            </div>
            <nav>
                <ul className="space-y-2">
                    {navItems.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => onNavigate(item.id)}
                                className={`flex items-center w-full px-4 py-3 rounded-lg font-semibold transition-colors ${currentPage === item.id ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

const TabNav: FC<{ currentPage: Page; onNavigate: (page: Page) => void }> = ({ currentPage, onNavigate }) => {
    const navItems = [
        { id: 'inicio' as Page, label: 'Inicio', icon: <HomeIcon /> },
        { id: 'criterios' as Page, label: 'Criterios', icon: <CriteriaIcon /> },
        { id: 'instrucciones' as Page, label: 'Docs', icon: <InstructionsIcon /> },
    ];

    return (
        <nav className="min-[750px]:hidden flex w-full bg-white border-b border-gray-200 sticky top-0 z-30">
            {navItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex-1 flex flex-col items-center justify-center py-3 text-[10px] font-bold uppercase transition-all ${currentPage === item.id ? 'text-gray-900 border-b-2 border-gray-900 bg-gray-50' : 'text-gray-400'}`}
                >
                    <span className="scale-90 mb-1">{item.icon}</span>
                    {item.label}
                </button>
            ))}
        </nav>
    );
};

const OptimizedVideo: FC<{ src: string; className?: string }> = ({ src, className }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    videoRef.current?.play().catch(() => {});
                } else {
                    videoRef.current?.pause();
                }
            },
            { threshold: 0.1 }
        );

        if (videoRef.current) observer.observe(videoRef.current);
        return () => observer.disconnect();
    }, [src]);

    return (
        <video 
            ref={videoRef}
            src={src} 
            className={className} 
            loop 
            muted 
            playsInline 
            disablePictureInPicture
            preload="metadata"
        />
    );
};

const ProductCard: FC<{ 
    product: ProductVariant; 
    onReplace: (product: ProductVariant) => void;
    onDragStart: (product: ProductVariant) => void;
    onDragEnd: () => void;
    isDragging: boolean;
}> = ({ product, onReplace, onDragStart, onDragEnd, isDragging }) => {
    const isInvalid = !product.hasStock || !product.hasPrice || !product.imageLink;
    const invalidReason = !product.imageLink ? 'SIN IMAGEN' : !product.hasStock ? 'SIN STOCK' : 'SIN PRECIO';

    return (
        <div 
            className={`bg-white rounded-lg border border-gray-200 group relative transition-all duration-200 hover:shadow-md ${isInvalid ? '' : 'cursor-move'} ${isDragging ? 'opacity-50 ring-2 ring-blue-500' : 'opacity-100'}`}
            draggable={!isInvalid}
            onDragStart={() => onDragStart(product)}
            onDragEnd={onDragEnd}
        >
            {!isInvalid && (
                <button 
                    onClick={() => onReplace(product)}
                    className="absolute top-2 left-2 z-10 p-2 bg-white/90 rounded-full text-gray-700 shadow-sm opacity-100 min-[750px]:opacity-0 min-[750px]:group-hover:opacity-100 transition-opacity hover:bg-white hover:scale-110"
                    aria-label="Reemplazar producto"
                >
                    <ReplaceIcon />
                </button>
            )}
            <div className="bg-gray-100 aspect-[3/4] w-full relative flex items-center justify-center rounded-t-lg overflow-hidden">
                {product.imageLink ? (
                    product.mediaType === MediaType.VIDEO ? (
                        <OptimizedVideo src={product.imageLink} className="w-full h-full object-cover" />
                    ) : (
                        <img src={product.imageLink} alt={product.title} className="w-full h-full object-cover" loading="lazy" /> 
                    )
                ) : (
                    <div className="text-gray-400"><ImageIcon /></div>
                )}
                {isInvalid && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center p-2 z-20 text-center">
                        <span className="font-bold text-red-600 bg-white px-2 py-1 rounded shadow-sm text-[10px] min-[750px]:text-sm">{invalidReason}</span>
                    </div>
                )}
                 {product.newInDate && (
                    <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] min-[750px]:text-xs font-bold px-1.5 min-[750px]:px-2 py-0.5 min-[750px]:py-1 rounded shadow-sm z-10">NEW IN</span>
                )}
                {product.mediaType !== MediaType.PRODUCT && (
                    <span className={`absolute bottom-2 left-2 text-white text-[9px] min-[750px]:text-xs font-bold px-1.5 min-[750px]:px-2 py-0.5 min-[750px]:py-1 rounded shadow-sm z-10 truncate max-w-[85%] ${product.mediaType === MediaType.VIDEO ? 'bg-indigo-500' : product.mediaType === MediaType.CAMPAIGN ? 'bg-purple-600' : 'bg-pink-500'}`}>
                        {product.mediaType === MediaType.CAMPAIGN ? (product.campaignName || 'Campaña') : product.mediaType === MediaType.VIDEO ? 'Video' : 'Modelo'}
                    </span>
                )}
            </div>
            <div className="p-2 min-[750px]:p-3">
                <p className="font-semibold text-[11px] min-[750px]:text-sm truncate leading-tight" title={product.title}>{product.title}</p>
                <div className="grid grid-cols-2 gap-1 min-[750px]:gap-2 mt-2 text-[9px] min-[750px]:text-xs text-gray-600 border-t pt-2">
                    <div>
                        <p className="font-bold text-gray-900 mb-0.5">Ecom</p>
                        <p>Stk: {product.stockEcommerce}</p>
                        <p>Rnk: {product.rankingAnalytics}</p>
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 mb-0.5">Locales</p>
                        <p>Stk: {product.stockLocales}</p>
                        <p>Rnk: {product.rankingLocales}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HomePage: FC<{ 
    products: ProductVariant[], 
    onUploadXML: (file: File) => void, 
    onUploadCSV: (file: File) => void,
    onUploadImages: (files: FileList) => void,
    onProcessFiles: () => void,
    onExportCSV: () => void,
    onReplaceProduct: (product: ProductVariant) => void,
    xmlFile: File | null,
    csvFile: File | null,
    imageFileCount: number,
    isLoading: boolean,
    criteria: Record<string, SortingRules>,
    activeCriterionName: string,
    setActiveCriterionName: (name: string) => void,
    feedbackMessage: string | null,
    draggedItem: ProductVariant | null;
    onDragStart: (product: ProductVariant) => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (product: ProductVariant) => void;
}> = ({ 
    products, onUploadXML, onUploadCSV, onUploadImages, onProcessFiles, onExportCSV, onReplaceProduct, 
    xmlFile, csvFile, imageFileCount, isLoading, criteria, activeCriterionName, setActiveCriterionName, 
    feedbackMessage, draggedItem, onDragStart, onDragEnd, onDragOver, onDrop 
}) => {
    const triggerFileUpload = (id: string) => document.getElementById(id)?.click();
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);

    return (
        <div className="space-y-4 min-[750px]:space-y-6">
            <header className="flex flex-col min-[750px]:flex-row justify-between items-start min-[750px]:items-center gap-4">
                <h1 className="text-xl min-[750px]:text-2xl font-bold text-gray-800">Orden Sábana</h1>
                <div className="flex flex-wrap items-center gap-2 min-[750px]:gap-4 w-full min-[750px]:w-auto">
                    <input type="file" id="xml-upload" className="hidden" accept=".xml" onChange={e => e.target.files && onUploadXML(e.target.files[0])} />
                    <input type="file" id="csv-upload" className="hidden" accept=".csv" onChange={e => e.target.files && onUploadCSV(e.target.files[0])} />
                    <input type="file" id="image-upload" className="hidden" accept="image/*,video/mp4" multiple onChange={e => e.target.files && onUploadImages(e.target.files)} />
                    
                    <div className="flex-1 min-[750px]:flex-none text-center">
                        <button onClick={() => triggerFileUpload('xml-upload')} className="w-full min-[750px]:w-auto px-2 min-[750px]:px-3 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg text-xs min-[750px]:text-sm hover:bg-gray-300">XML</button>
                        {xmlFile && <p className="text-[9px] text-gray-500 mt-1 truncate max-w-[60px] min-[750px]:max-w-[100px] mx-auto">{xmlFile.name}</p>}
                    </div>
                    <div className="flex-1 min-[750px]:flex-none text-center">
                         <button onClick={() => triggerFileUpload('csv-upload')} className="w-full min-[750px]:w-auto px-2 min-[750px]:px-3 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg text-xs min-[750px]:text-sm hover:bg-gray-300">CSV</button>
                         {csvFile && <p className="text-[9px] text-gray-500 mt-1 truncate max-w-[60px] min-[750px]:max-w-[100px] mx-auto">{csvFile.name}</p>}
                    </div>
                    <button 
                        onClick={onProcessFiles}
                        disabled={!xmlFile || !csvFile || isLoading}
                        className="flex-1 min-[750px]:flex-none px-4 min-[750px]:px-6 py-2 bg-gray-800 text-white font-semibold rounded-lg text-xs min-[750px]:text-sm hover:bg-gray-900 disabled:bg-gray-400 transition-colors"
                    >
                        {isLoading ? '...' : 'Procesar'}
                    </button>
                </div>
            </header>
            
            <div className="bg-white border rounded-lg p-3 min-[750px]:p-4 flex flex-col min-[750px]:flex-row items-stretch min-[750px]:items-center gap-3 min-[750px]:gap-4 shadow-sm">
                <div className="flex-grow flex items-center gap-2">
                    <label htmlFor="criteria-select" className="font-semibold text-gray-700 text-xs min-[750px]:text-sm">Criterio:</label>
                    <select 
                        id="criteria-select"
                        value={activeCriterionName}
                        onChange={(e) => setActiveCriterionName(e.target.value)}
                        className="flex-grow min-[750px]:flex-none min-[750px]:w-64 p-2 bg-gray-50 border-gray-200 border rounded-md text-xs min-[750px]:text-sm outline-none focus:ring-1 focus:ring-gray-400"
                    >
                        {Object.keys(criteria).map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>
                <button onClick={onExportCSV} disabled={products.length === 0} className="px-4 min-[750px]:px-6 py-2 bg-green-500 text-white font-semibold rounded-lg text-xs min-[750px]:text-sm hover:bg-green-600 disabled:bg-gray-400 transition-colors">Exportar CSV</button>
            </div>

            {feedbackMessage && <div className="bg-green-50 text-green-800 border border-green-200 p-3 rounded-lg text-xs font-medium animate-fade-in">{feedbackMessage}</div>}

            {isLoading ? (
                <div className="text-center py-20 bg-gray-100 rounded-lg animate-pulse">
                    <h3 className="text-sm min-[750px]:text-lg font-medium text-gray-600">Procesando sábana...</h3>
                </div>
            ) : products.length > 0 ? (
                <div className="grid grid-cols-2 min-[750px]:grid-cols-4 gap-3 min-[750px]:gap-6">
                    {products.map(product => (
                       <div 
                            key={product.id} 
                            onDragOver={(e) => {
                                onDragOver(e);
                                if (draggedItem && draggedItem.id !== product.id) setDropTargetId(product.id);
                            }}
                            onDragLeave={() => setDropTargetId(null)}
                            onDrop={() => {
                                onDrop(product);
                                setDropTargetId(null);
                            }}
                            className={`rounded-lg transition-all ${dropTargetId === product.id ? 'ring-2 min-[750px]:ring-4 ring-blue-500 ring-offset-2 min-[750px]:ring-offset-4 scale-[1.02] z-10' : ''}`}
                        >
                            <ProductCard 
                                product={product} 
                                onReplace={onReplaceProduct}
                                onDragStart={onDragStart}
                                onDragEnd={onDragEnd}
                                isDragging={draggedItem?.id === product.id} 
                            />
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="text-center py-20 bg-gray-50 border-2 border-dashed rounded-lg">
                    <h3 className="text-sm min-[750px]:text-lg font-medium text-gray-400 px-4">Sube tus archivos XML y CSV para generar el orden.</h3>
                </div>
            )}
        </div>
    );
};

const CriteriaPage: FC<{ 
    excludedProductTypes: string[]; 
    setExcludedProductTypes: React.Dispatch<React.SetStateAction<string[]>>;
    criteria: Record<string, SortingRules>;
    setCriteria: React.Dispatch<React.SetStateAction<Record<string, SortingRules>>>;
    editingCriterionName: string;
    setEditingCriterionName: React.Dispatch<React.SetStateAction<string>>;
    editingCriterionNameInput: string;
    setEditingCriterionNameInput: React.Dispatch<React.SetStateAction<string>>;
    handleNewCriterion: () => void;
    handleUpdateCriterionName: () => void;
    handleDeleteCriterion: (name: string) => void;
    lowPriorityKeywords: string[];
    setLowPriorityKeywords: React.Dispatch<React.SetStateAction<string[]>>;
}> = ({ 
    excludedProductTypes, setExcludedProductTypes, criteria, setCriteria, 
    editingCriterionName, setEditingCriterionName, editingCriterionNameInput, setEditingCriterionNameInput,
    handleNewCriterion, handleUpdateCriterionName, handleDeleteCriterion,
    lowPriorityKeywords, setLowPriorityKeywords
}) => {
    
    const activeRules = criteria[editingCriterionName];

    const handleAddRowRule = () => {
        if (!activeRules) return;
        const newRule: RowRule = { id: Date.now().toString(), age: '', gender: '', productTypes: [] };
        updateRulesForCriterion(editingCriterionName, { ...activeRules, rowSequencing: [...activeRules.rowSequencing, newRule] });
    };

    const handleRemoveRowRule = (id: string) => {
        if (!activeRules) return;
        updateRulesForCriterion(editingCriterionName, { ...activeRules, rowSequencing: activeRules.rowSequencing.filter(r => r.id !== id) });
    };

    const updateRulesForCriterion = (name: string, updatedRules: SortingRules) => {
        setCriteria(prev => ({...prev, [name]: updatedRules }));
    };

    return (
        <div className="space-y-4 min-[750px]:space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-xl min-[750px]:text-2xl font-bold text-gray-800">Criterios de Orden</h1>
                <button onClick={handleNewCriterion} className="px-3 min-[750px]:px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg text-xs min-[750px]:text-sm hover:bg-gray-900 transition-colors">Nuevo</button>
            </header>

            <div className="space-y-4">
                <details className="bg-white border rounded-lg group shadow-sm" open>
                    <summary className="p-3 min-[750px]:p-4 cursor-pointer font-semibold text-gray-700 flex items-center justify-between text-sm min-[750px]:text-base">
                        Filtros de Exclusión y Prioridad
                        <ChevronDownIcon />
                    </summary>
                    <div className="p-3 min-[750px]:p-4 border-t space-y-4 bg-gray-50/30">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Productos Excluidos (Al final)</label>
                            <input
                                type="text"
                                value={excludedProductTypes.join(', ')}
                                onChange={e => setExcludedProductTypes(e.target.value.split(',').map(s => s.trim()))}
                                placeholder="TIPO1, TIPO2..."
                                className="w-full p-2 bg-white border rounded-md text-xs min-[750px]:text-sm outline-none focus:ring-1 focus:ring-gray-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Baja Prioridad (Básicos)</label>
                            <input
                                type="text"
                                value={lowPriorityKeywords.join(', ')}
                                onChange={e => setLowPriorityKeywords(e.target.value.split(',').map(s => s.trim()))}
                                placeholder="Basico, Sunny..."
                                className="w-full p-2 bg-white border rounded-md text-xs min-[750px]:text-sm outline-none focus:ring-1 focus:ring-yellow-400"
                            />
                        </div>
                    </div>
                </details>

                <div className="bg-white border rounded-lg p-3 min-[750px]:p-4 shadow-sm">
                    <div className="flex flex-col min-[750px]:flex-row items-stretch min-[750px]:items-center gap-2 min-[750px]:gap-3 mb-4 min-[750px]:mb-6">
                        <select value={editingCriterionName} onChange={e => setEditingCriterionName(e.target.value)} className="p-2 bg-gray-50 border rounded-md text-xs min-[750px]:text-sm font-medium">
                             {Object.keys(criteria).map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                        <div className="flex gap-2 w-full min-[750px]:flex-grow">
                            <input
                                type="text"
                                value={editingCriterionNameInput}
                                onChange={(e) => setEditingCriterionNameInput(e.target.value)}
                                className="flex-grow p-2 border rounded-md text-xs min-[750px]:text-sm"
                            />
                            <button onClick={handleUpdateCriterionName} className="px-3 min-[750px]:px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs min-[750px]:text-sm font-semibold transition-colors">Guardar</button>
                            <button onClick={() => handleDeleteCriterion(editingCriterionName)} className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"><TrashIcon /></button>
                        </div>
                    </div>

                    {activeRules && (
                        <div className="space-y-3 min-[750px]:space-y-4">
                            <h3 className="font-bold text-gray-700 mb-1 min-[750px]:mb-2 text-xs min-[750px]:text-sm uppercase tracking-wide">Secuencia por Filas (x4)</h3>
                            <div className="space-y-2">
                                {activeRules.rowSequencing.map((rule, index) => (
                                    <div key={rule.id} className="bg-gray-50 p-2 min-[750px]:p-3 rounded-md flex flex-col min-[750px]:flex-row items-stretch min-[750px]:items-center gap-2 min-[750px]:gap-3 border">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-gray-400 text-[10px] min-[750px]:text-xs uppercase">Fila {index + 1}</span>
                                            <button onClick={() => handleRemoveRowRule(rule.id)} className="min-[750px]:hidden text-red-500 p-1"><TrashIcon /></button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 flex-shrink-0">
                                            <select value={rule.age} onChange={(e) => {
                                                const updated = activeRules.rowSequencing.map(r => r.id === rule.id ? { ...r, age: e.target.value as Age } : r);
                                                updateRulesForCriterion(editingCriterionName, { ...activeRules, rowSequencing: updated });
                                            }} className="p-1.5 bg-white border rounded-md text-[11px] min-[750px]:text-xs">
                                                <option value="">Edad</option>
                                                {Object.values(Age).map(age => <option key={age} value={age}>{age}</option>)}
                                            </select>
                                            <select value={rule.gender} onChange={(e) => {
                                                const updated = activeRules.rowSequencing.map(r => r.id === rule.id ? { ...r, gender: e.target.value as Gender } : r);
                                                updateRulesForCriterion(editingCriterionName, { ...activeRules, rowSequencing: updated });
                                            }} className="p-1.5 bg-white border rounded-md text-[11px] min-[750px]:text-xs">
                                                <option value="">Género</option>
                                                {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="REMERAS, PANTALONES..."
                                            value={rule.productTypes?.join(', ') || ''}
                                            onChange={(e) => {
                                                const updated = activeRules.rowSequencing.map(r => r.id === rule.id ? { ...r, productTypes: e.target.value.split(',').map(s => s.trim()) } : r);
                                                updateRulesForCriterion(editingCriterionName, { ...activeRules, rowSequencing: updated });
                                            }}
                                            className="flex-grow p-1.5 bg-white border rounded-md text-[11px] min-[750px]:text-xs outline-none focus:ring-1 focus:ring-blue-300"
                                        />
                                        <button onClick={() => handleRemoveRowRule(rule.id)} className="hidden min-[750px]:block text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"><TrashIcon /></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleAddRowRule} className="w-full py-2 min-[750px]:py-3 text-blue-600 font-bold bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-xs min-[750px]:text-sm">+ Añadir Fila</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const RichTextEditor: FC<{ content: string; onChange: (html: string) => void }> = ({ content, onChange }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const exec = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };
    const handleInput = () => { if (editorRef.current) onChange(editorRef.current.innerHTML); };
    const insertHtml = (html: string) => {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (editorRef.current && !editorRef.current.contains(range.commonAncestorContainer)) editorRef.current.focus();
        const div = document.createElement('div'); div.innerHTML = html;
        const fragment = document.createDocumentFragment();
        let node, lastNode;
        while ((node = div.firstChild)) lastNode = fragment.appendChild(node);
        range.deleteContents(); range.insertNode(fragment);
        if (lastNode) { range.setStartAfter(lastNode); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); }
        handleInput();
    };
    const TButton: FC<{ cmd: string; arg?: string; icon: React.ReactNode; title: string }> = ({ cmd, arg, icon, title }) => (
        <button className="p-1.5 min-[750px]:p-2 hover:bg-gray-200 rounded text-gray-700" onMouseDown={(e) => { e.preventDefault(); exec(cmd, arg); }} title={title}>{icon}</button>
    );

    return (
        <div className="flex flex-col h-full border rounded-md overflow-hidden bg-white">
            <div className="flex flex-wrap gap-1 bg-gray-50 p-1.5 min-[750px]:p-2 border-b items-center">
                 <TButton cmd="bold" icon={<b>B</b>} title="Bold" />
                 <TButton cmd="italic" icon={<i>I</i>} title="Italic" />
                 <TButton cmd="underline" icon={<u>U</u>} title="Underline" />
                 <div className="w-px h-4 min-[750px]:h-6 bg-gray-300 mx-1"></div>
                 <TButton cmd="insertUnorderedList" icon={<span>• List</span>} title="Bullet" />
                 <div className="w-px h-4 min-[750px]:h-6 bg-gray-300 mx-1"></div>
                  <select 
                    className="p-1 border rounded text-[10px] min-[750px]:text-xs" 
                    onChange={(e) => { if (e.target.value) insertHtml(e.target.value); e.target.value = ""; }}
                  >
                    <option value="">+ Insertar</option>
                    <option value={`<div class="bg-gray-50 p-4 rounded-lg border my-2"><h4>Título</h4><p>...</p></div>`}>Caja Info</option>
                    <option value={`<span class="bg-indigo-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">VIDEO</span>`}>Badge Video</option>
                  </select>
            </div>
            <div ref={editorRef} className="flex-1 p-3 min-[750px]:p-4 overflow-y-auto outline-none prose prose-sm max-w-none" contentEditable onInput={handleInput} dangerouslySetInnerHTML={{ __html: content }} spellCheck={false} />
        </div>
    );
};

const InstructionsPage: FC<{ initialContent: string; onSave: (content: string) => void }> = ({ initialContent, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(initialContent);
    return (
        <div className="flex flex-col h-full space-y-4">
            <header className="flex justify-between items-center">
                <h1 className="text-xl min-[750px]:text-2xl font-bold text-gray-800">Instrucciones</h1>
                 <button onClick={() => isEditing ? (onSave(content), setIsEditing(false)) : setIsEditing(true)} className={`px-4 py-2 font-semibold rounded-lg text-xs min-[750px]:text-sm transition-colors ${isEditing ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                    {isEditing ? 'Guardar' : 'Editar'}
                </button>
            </header>
            <div className="flex-1 bg-white rounded-lg border overflow-hidden shadow-sm">
                {isEditing ? <RichTextEditor content={content} onChange={setContent} /> : <div className="prose prose-sm max-w-none p-4 min-[750px]:p-6 h-full overflow-y-auto" dangerouslySetInnerHTML={{ __html: content }} />}
            </div>
        </div>
    );
};

const ReplacementModal: FC<{
    product: ProductVariant;
    candidates: ProductVariant[];
    onClose: () => void;
    onSelect: (replacement: ProductVariant) => void;
}> = ({ product, candidates, onClose, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCandidates = useMemo(() => {
        const lower = searchTerm.toLowerCase();
        return candidates.filter(c => !searchTerm || c.title.toLowerCase().includes(lower) || c.grupoSku.toLowerCase().includes(lower));
    }, [candidates, searchTerm]);

    const categories = useMemo(() => {
        const cats = [
            { title: 'Por Tipo', items: filteredCandidates.filter(c => c.tipoPrenda === product.tipoPrenda) },
            { title: 'Videos', items: filteredCandidates.filter(c => c.mediaType === MediaType.VIDEO) },
            { title: 'Top Stock', items: filteredCandidates.sort((a, b) => b.stockEcommerce - a.stockEcommerce).slice(0, 20) },
        ];
        return cats.filter(c => c.items.length > 0);
    }, [product, filteredCandidates]);

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end min-[750px]:items-center justify-center p-0 min-[750px]:p-4" onClick={onClose}>
            <div className="bg-white rounded-t-2xl min-[750px]:rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] min-[750px]:h-[90vh] flex flex-col overflow-hidden animate-slide-up min-[750px]:animate-fade-in" onClick={e => e.stopPropagation()}>
                <header className="p-3 min-[750px]:p-4 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex justify-between items-center mb-3 min-[750px]:mb-4">
                        <h2 className="text-base min-[750px]:text-lg font-bold">Intercambiar producto</h2>
                        <button onClick={onClose} className="text-2xl min-[750px]:text-3xl">&times;</button>
                    </div>
                    <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 min-[750px]:p-3 border rounded-xl shadow-sm outline-none focus:ring-1 focus:ring-blue-500 text-xs min-[750px]:text-sm" />
                </header>
                <main className="flex-1 overflow-y-auto p-3 min-[750px]:p-4 space-y-6 min-[750px]:space-y-8 no-scrollbar">
                    {categories.map(cat => (
                        <div key={cat.title}>
                            <h3 className="font-bold text-gray-800 mb-2 min-[750px]:mb-3 border-b pb-1 text-[10px] min-[750px]:text-xs uppercase tracking-widest">{cat.title}</h3>
                            <div className="flex gap-3 min-[750px]:gap-4 overflow-x-auto pb-4 no-scrollbar">
                                {cat.items.map(item => (
                                    <button key={item.id} onClick={() => onSelect(item)} className="flex-shrink-0 w-28 min-[750px]:w-40 text-left hover:scale-[1.02] transition-transform">
                                        <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden relative mb-1.5 shadow-sm">
                                            {item.mediaType === MediaType.VIDEO ? <OptimizedVideo src={item.imageLink} className="w-full h-full object-cover" /> : <img src={item.imageLink} className="w-full h-full object-cover" loading="lazy" />}
                                        </div>
                                        <p className="text-[10px] min-[750px]:text-xs font-bold truncate">{item.title}</p>
                                        <p className="text-[9px] min-[750px]:text-[10px] text-gray-500 font-medium">Stk: {item.stockEcommerce}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </main>
            </div>
        </div>
    );
};

export default function App() {
    const [currentPage, setCurrentPage] = useState<Page>('inicio');
    const [xmlFile, setXmlFile] = useState<File | null>(null);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [imageFiles, setImageFiles] = useState<FileList | null>(null);
    const [allProducts, setAllProducts] = useState<ProductVariant[]>([]);
    const [originalCsvData, setOriginalCsvData] = useState<CsvProduct[]>([]);
    const [originalCsvHeaders, setOriginalCsvHeaders] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [excludedProductTypes, setExcludedProductTypes] = useState<string[]>([]);
    const [lowPriorityKeywords, setLowPriorityKeywords] = useState<string[]>(["Abbie", "Sunny", "Berni", "Basico", "Ojota"]);
    const [criteria, setCriteria] = useState<Record<string, SortingRules>>({ 'Criterio Por Defecto': { rowSequencing: [], logic: SortLogic.SEQUENTIAL } });
    const [activeCriterionName, setActiveCriterionName] = useState<string>('Criterio Por Defecto');
    const [editingCriterionName, setEditingCriterionName] = useState<string>('Criterio Por Defecto');
    const [editingCriterionNameInput, setEditingCriterionNameInput] = useState<string>('Criterio Por Defecto');
    const [instructionsContent, setInstructionsContent] = useState(() => localStorage.getItem(INSTRUCTIONS_STORAGE_KEY) || getDefaultInstructions());
    const [productToReplace, setProductToReplace] = useState<ProductVariant | null>(null);
    const [displayedProducts, setDisplayedProducts] = useState<ProductVariant[]>([]);
    const [draggedItem, setDraggedItem] = useState<ProductVariant | null>(null);

    const processFiles = useCallback(async (xml: File, csv: File) => {
        setIsLoading(true); setFeedbackMessage(null);
        try {
            const [xmlData, csvParsed] = await Promise.all([parseXML(xml), parseCSV(csv)]);
            const allVariants = synchronizeAndFilterData(xmlData, csvParsed.data);
            setAllProducts(allVariants); setOriginalCsvData(csvParsed.data); setOriginalCsvHeaders(csvParsed.headers);
            setFeedbackMessage(`Cargados ${allVariants.length} productos correctamente.`);
        } catch (e) { console.error(e); alert("Error procesando archivos. Revisa el formato."); }
        finally { setIsLoading(false); }
    }, []);

    const sortedProducts = useMemo(() => {
        if (!allProducts.length) return [];
        return sortProducts(allProducts, criteria[activeCriterionName], excludedProductTypes, lowPriorityKeywords);
    }, [allProducts, criteria, activeCriterionName, excludedProductTypes, lowPriorityKeywords]);

    useEffect(() => { setDisplayedProducts(sortedProducts); }, [sortedProducts]);

    const handleExportCSV = () => {
        if (!originalCsvData.length) return;
        const csvContent = "\uFEFF" + [originalCsvHeaders.join(','), ...originalCsvData.map(row => originalCsvHeaders.map(h => `"${(row[h as keyof CsvProduct] || '').toString().replace(/"/g, '""')}"`).join(','))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); link.href = url; link.download = "orden_sabana.csv"; link.click();
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'inicio': return <HomePage products={displayedProducts} onUploadXML={setXmlFile} onUploadCSV={setCsvFile} onUploadImages={setImageFiles} onProcessFiles={() => processFiles(xmlFile!, csvFile!)} onExportCSV={handleExportCSV} onReplaceProduct={setProductToReplace} xmlFile={xmlFile} csvFile={csvFile} imageFileCount={imageFiles?.length || 0} isLoading={isLoading} criteria={criteria} activeCriterionName={activeCriterionName} setActiveCriterionName={setActiveCriterionName} feedbackMessage={feedbackMessage} draggedItem={draggedItem} onDragStart={setDraggedItem} onDragEnd={() => setDraggedItem(null)} onDragOver={e => e.preventDefault()} onDrop={target => {
                if (!draggedItem) return;
                const newItems = [...displayedProducts];
                const fromIdx = newItems.findIndex(p => p.id === draggedItem.id);
                const toIdx = newItems.findIndex(p => p.id === target.id);
                if (fromIdx > -1 && toIdx > -1) { [newItems[fromIdx]] = newItems.splice(toIdx, 1, newItems[fromIdx]); setDisplayedProducts(newItems); }
                setDraggedItem(null);
            }} />;
            case 'criterios': return <CriteriaPage excludedProductTypes={excludedProductTypes} setExcludedProductTypes={setExcludedProductTypes} criteria={criteria} setCriteria={setCriteria} editingCriterionName={editingCriterionName} setEditingCriterionName={setEditingCriterionName} editingCriterionNameInput={editingCriterionNameInput} setEditingCriterionNameInput={setEditingCriterionNameInput} handleNewCriterion={() => { const name = `Criterio ${Object.keys(criteria).length + 1}`; setCriteria(p => ({ ...p, [name]: { rowSequencing: [], logic: SortLogic.SEQUENTIAL } })); setEditingCriterionName(name); }} handleUpdateCriterionName={() => {
                const old = editingCriterionName; const next = editingCriterionNameInput.trim();
                if (!next || criteria[next]) return;
                const nextCriteria = { ...criteria }; const rules = nextCriteria[old]; delete nextCriteria[old]; nextCriteria[next] = rules;
                setCriteria(nextCriteria); setEditingCriterionName(next); if (activeCriterionName === old) setActiveCriterionName(next);
            }} handleDeleteCriterion={name => { if (Object.keys(criteria).length > 1 && confirm('¿Deseas eliminar este criterio?')) { setCriteria(p => { const next = { ...p }; delete next[name]; return next; }); const keys = Object.keys(criteria).filter(k => k !== name); setActiveCriterionName(keys[0]); setEditingCriterionName(keys[0]); } }} lowPriorityKeywords={lowPriorityKeywords} setLowPriorityKeywords={setLowPriorityKeywords} />;
            case 'instrucciones': return <InstructionsPage initialContent={instructionsContent} onSave={c => { setInstructionsContent(c); localStorage.setItem(INSTRUCTIONS_STORAGE_KEY, c); }} />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-0 min-[750px]:p-4 min-[1100px]:p-8">
            <div className="w-full max-w-[1600px] bg-white min-[750px]:rounded-2xl min-[750px]:shadow-2xl flex flex-col min-[750px]:flex-row h-screen min-[750px]:h-[90vh] overflow-hidden">
                <TabNav currentPage={currentPage} onNavigate={setCurrentPage} />
                <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
                <main className="flex-1 bg-gray-50 p-4 min-[750px]:p-6 min-[1100px]:p-8 overflow-y-auto min-[750px]:rounded-r-2xl no-scrollbar">
                    {renderPage()}
                </main>
            </div>

            {productToReplace && (
                <ReplacementModal
                    product={productToReplace}
                    candidates={displayedProducts.filter(p => p.id !== productToReplace.id && p.hasStock && p.hasPrice && p.imageLink)}
                    onClose={() => setProductToReplace(null)}
                    onSelect={replacement => {
                        const next = [...displayedProducts];
                        const from = next.findIndex(p => p.id === productToReplace.id);
                        const to = next.findIndex(p => p.id === replacement.id);
                        if (from > -1 && to > -1) { [next[from], next[to]] = [next[to], next[from]]; setDisplayedProducts(next); }
                        setProductToReplace(null);
                    }}
                />
            )}
            
            <style dangerouslySetInnerHTML={{ __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes slide-up {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.3s ease-out; }
                .animate-fade-in { animation: fadeIn 0.3s ease-in; }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}} />
        </div>
    );
}
