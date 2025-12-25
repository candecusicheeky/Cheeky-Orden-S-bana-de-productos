
import React, { useState, useCallback, useMemo, FC, useEffect, useRef } from 'react';
import { ProductVariant, SortingRules, SortLogic, Age, Gender, RowRule, MediaType, CsvProduct, ReplacementCategory } from './types';
import { parseXML, parseCSV, synchronizeAndFilterData, sortProducts, matchFilesToProducts } from './services/dataProcessor';
import { HomeIcon, CriteriaIcon, InstructionsIcon, TrashIcon, ChevronDownIcon, ReplaceIcon, ImageIcon } from './components/icons';

type Page = 'inicio' | 'criterios' | 'instrucciones';

const STORAGE_KEY = 'cheeky_sorter_app_state_v10';

const Sidebar: FC<{ currentPage: Page; onNavigate: (page: Page) => void }> = ({ currentPage, onNavigate }) => {
    return (
        <>
            <aside className="hidden min-[750px]:flex w-64 bg-[#F0F2F5] p-6 flex-shrink-0 flex-col fixed top-0 left-0 bottom-0 z-[50]">
                <div className="mb-10 text-center">
                    <h1 className="text-xl font-black text-slate-900 tracking-tighter">Cheeky</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Orden Sábana</p>
                </div>
                <nav>
                    <ul className="space-y-1">
                        {[
                            { id: 'inicio' as Page, label: 'Productos', icon: <HomeIcon /> },
                            { id: 'criterios' as Page, label: 'Criterios de orden', icon: <CriteriaIcon /> },
                            { id: 'instrucciones' as Page, label: 'Intrucciones (Doc)', icon: <InstructionsIcon /> }
                        ].map((item) => (
                            <li key={item.id}>
                                <button
                                    onClick={() => onNavigate(item.id)}
                                    className={`flex items-center w-full px-4 py-3 rounded-xl font-bold text-[12px] transition-all ${currentPage === item.id ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    {item.icon}
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
            <nav className="min-[750px]:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-3 z-[100] flex justify-around items-center shadow-lg">
                {[
                    { id: 'inicio' as Page, label: 'Prods', icon: <HomeIcon /> },
                    { id: 'criterios' as Page, label: 'Crit', icon: <CriteriaIcon /> },
                    { id: 'instrucciones' as Page, label: 'Doc', icon: <InstructionsIcon /> }
                ].map((item) => (
                    <button key={item.id} onClick={() => onNavigate(item.id)} className={`flex flex-col items-center gap-1 transition-all ${currentPage === item.id ? 'text-slate-900' : 'text-slate-400'}`}>
                        <div className="scale-75">{item.icon}</div>
                        <span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span>
                    </button>
                ))}
            </nav>
        </>
    );
};

const OptimizedVideo: FC<{ src: string; className?: string }> = ({ src, className }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (videoRef.current) videoRef.current.play().catch(() => {});
    }, [src]);
    return <video ref={videoRef} src={src} className={className} loop muted playsInline autoPlay disablePictureInPicture preload="metadata" />;
};

const ProductCard: FC<{ 
    product: ProductVariant; 
    onReplace: (product: ProductVariant) => void;
    onDragStart: (product: ProductVariant) => void;
    onDragEnd: () => void;
    isDragging: boolean;
}> = ({ product, onReplace, onDragStart, onDragEnd, isDragging }) => {
    const isInvalid = !product.hasStock || !product.hasPrice || !product.hasImage || !product.imageLink;
    
    return (
        <div className={`bg-white rounded-xl border border-slate-100 group relative transition-all duration-300 hover:shadow-lg ${isDragging ? 'opacity-30' : 'opacity-100'}`} draggable={true} onDragStart={() => onDragStart(product)} onDragEnd={onDragEnd}>
            <div className="bg-[#EFEFEF] aspect-[3/4] w-full relative flex items-center justify-center rounded-t-xl overflow-hidden">
                {product.imageLink ? (
                    product.mediaType === MediaType.VIDEO ? (
                        <OptimizedVideo src={product.imageLink} className="w-full h-full object-cover" />
                    ) : (
                        <img src={product.imageLink} alt={product.title} className="w-full h-full object-cover" loading="lazy" /> 
                    )
                ) : (
                    <div className="text-slate-300 scale-75"><ImageIcon /></div>
                )}
                
                <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1 z-10">
                    {product.newInDate && (
                        <span className="w-fit bg-[#4ADE80] text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase">New In</span>
                    )}
                    {product.mediaType === MediaType.VIDEO && (
                        <span className="w-fit bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase">VIDEO</span>
                    )}
                    {product.mediaType === MediaType.CAMPAIGN && (
                        <span className="w-fit bg-purple-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase truncate max-w-full">
                            {product.campaignName || 'CAMPAÑA'}
                        </span>
                    )}
                    {product.mediaType === MediaType.MODEL && (
                        <span className="w-fit bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase">FOTO MODELO</span>
                    )}
                </div>

                <button onClick={(e) => { e.stopPropagation(); onReplace(product); }} className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg text-[10px] font-bold text-slate-800 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 w-[95%] border border-slate-100">
                    <ReplaceIcon /> Reemplazar
                </button>
            </div>
            <div className="p-3 bg-white rounded-b-xl border-t border-slate-50">
                <h3 className="font-bold text-[10px] text-slate-900 truncate uppercase tracking-tight mb-2">{product.title}</h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase mb-3 truncate">{product.color} | {product.grupoSku}</p>
                {isInvalid && (
                    <div className="mb-2 space-y-0.5">
                        {!product.hasStock && <p className="text-red-500 text-[9px] font-bold uppercase tracking-tight">Falta Stock</p>}
                        {!product.hasPrice && <p className="text-red-500 text-[9px] font-bold uppercase tracking-tight">Falta Precio</p>}
                        {(!product.hasImage || !product.imageLink) && <p className="text-red-500 text-[9px] font-bold uppercase tracking-tight">Falta Foto</p>}
                    </div>
                )}
                <div className="grid grid-cols-2 text-[8px] text-slate-400 border border-slate-50 rounded-lg overflow-hidden">
                    <div className="p-1.5 border-r border-slate-50">
                        <p className="font-bold text-slate-500 mb-1 border-b border-slate-50 pb-1">Ecommerce</p>
                        <p>Stock: <span className="text-slate-900">[{product.stockEcommerce}]</span></p>
                        <p>Ranking: <span className="text-slate-900">[{product.rankingAnalytics}]</span></p>
                    </div>
                    <div className="p-1.5">
                        <p className="font-bold text-slate-500 mb-1 border-b border-slate-50 pb-1">Locales</p>
                        <p>Stock: <span className="text-slate-900">[{product.stockLocales}]</span></p>
                        <p>Ranking: <span className="text-slate-900">[{product.rankingLocales}]</span></p>
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
    onUploadMedia: (files: File[]) => void,
    onProcessFiles: () => void,
    onExportCSV: () => void,
    onReplaceProduct: (product: ProductVariant) => void,
    xmlFile: File | null,
    csvFile: File | null,
    isLoading: boolean,
    criteria: Record<string, SortingRules>,
    activeCriterionName: string,
    setActiveCriterionName: (name: string) => void,
    feedbackMessage: string | null,
    draggedItem: ProductVariant | null;
    onDragStart: (product: ProductVariant) => void;
    onDragEnd: () => void;
    onDrop: (product: ProductVariant) => void;
}> = ({ 
    products, onUploadXML, onUploadCSV, onUploadMedia, onProcessFiles, onExportCSV, onReplaceProduct, 
    xmlFile, csvFile, isLoading, criteria, activeCriterionName, setActiveCriterionName, 
    feedbackMessage, draggedItem, onDragStart, onDragEnd, onDrop 
}) => {
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);

    return (
        <div className="space-y-6 animate-fade-in pb-20 min-[750px]:pb-0">
            <header className="flex flex-col min-[1100px]:flex-row justify-between items-start min-[1100px]:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tighter uppercase">Orden Sábana</h1>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="w-[180px] flex flex-col gap-1">
                        <label className="w-full px-4 py-2.5 bg-[#EFEFEF] text-slate-900 font-bold rounded-xl text-[11px] cursor-pointer hover:bg-slate-200 text-center block">
                            Subir archivo XML
                            <input type="file" className="hidden" accept=".xml" onChange={e => e.target.files && onUploadXML(e.target.files[0])} />
                        </label>
                        {xmlFile && <span className="text-[9px] font-bold text-slate-400 pl-2 truncate text-center">{xmlFile.name}</span>}
                    </div>
                    <div className="w-[180px] flex flex-col gap-1">
                        <label className="w-full px-4 py-2.5 bg-[#EFEFEF] text-slate-900 font-bold rounded-xl text-[11px] cursor-pointer hover:bg-slate-200 text-center block">
                            Subir archivo CSV
                            <input type="file" className="hidden" accept=".csv" onChange={e => e.target.files && onUploadCSV(e.target.files[0])} />
                        </label>
                        {csvFile && <span className="text-[9px] font-bold text-slate-400 pl-2 truncate text-center">{csvFile.name}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="px-4 py-2.5 bg-transparent text-slate-900 font-bold rounded-xl text-[11px] cursor-pointer hover:bg-slate-100 transition-colors">
                            Subir foto/video (masivo)
                            <input type="file" className="hidden" multiple accept="image/*,video/*" onChange={e => e.target.files && onUploadMedia(Array.from(e.target.files))} />
                        </label>
                        <button onClick={onProcessFiles} disabled={!xmlFile || !csvFile || isLoading} className="px-8 py-2.5 bg-[#262626] text-white font-bold rounded-xl text-[11px] hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 shadow-sm transition-all">
                            Procesar
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex flex-col min-[1100px]:flex-row items-center justify-between gap-4">
                <div className="flex items-center justify-between gap-4 w-full min-[1100px]:w-auto bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <span className="text-[11px] font-bold text-slate-400 pl-3 uppercase tracking-tighter">Seleccionar Estrategia</span>
                        <select value={activeCriterionName} onChange={(e) => setActiveCriterionName(e.target.value)} className="p-2 bg-slate-50 border-none rounded-xl text-[11px] font-bold outline-none text-slate-800">
                            {Object.keys(criteria).map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-4 pr-2">
                        <div className="h-6 w-px bg-slate-100 mx-1"></div>
                        <button onClick={onExportCSV} disabled={products.length === 0} className="px-4 py-2 bg-[#A8D5BA] text-white font-bold rounded-xl text-[11px] hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-300 transition-all">
                            Exportar CSV
                        </button>
                    </div>
                </div>
            </div>

            {feedbackMessage && <div className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl border border-emerald-100 text-[11px] font-bold animate-fade-in">{feedbackMessage}</div>}

            {products.length > 0 ? (
                <div className="grid grid-cols-2 min-[991px]:grid-cols-4 gap-4">
                    {products.map(product => (
                       <div key={product.id} onDragOver={(e) => { e.preventDefault(); if (draggedItem && draggedItem.id !== product.id) setDropTargetId(product.id); }} onDragLeave={() => setDropTargetId(null)} onDrop={(e) => { e.preventDefault(); onDrop(product); setDropTargetId(null); }} className={`rounded-2xl transition-all ${dropTargetId === product.id ? 'ring-2 ring-emerald-400 ring-offset-4 scale-105 z-10 shadow-xl' : ''}`}>
                            <ProductCard product={product} onReplace={onReplaceProduct} onDragStart={onDragStart} onDragEnd={() => setDropTargetId(null)} isDragging={draggedItem?.id === product.id} />
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="text-center py-40 flex flex-col items-center justify-center space-y-4">
                    <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest">Esperando archivos...</h3>
                </div>
            )}
        </div>
    );
};

const CriteriaPage: FC<{ 
    excludedProductTypes: string[]; 
    setExcludedProductTypes: (v: string[]) => void;
    criteria: Record<string, SortingRules>;
    setCriteria: (v: Record<string, SortingRules>) => void;
    editingCriterionName: string;
    setEditingCriterionName: (v: string) => void;
    handleNewCriterion: () => void;
    handleDeleteCriterion: (name: string) => void;
    handleRenameCriterion: (oldName: string, newName: string) => void;
    basicSkus: string[];
    setBasicSkus: (v: string[]) => void;
}> = ({ 
    excludedProductTypes, setExcludedProductTypes, criteria, setCriteria, 
    editingCriterionName, setEditingCriterionName,
    handleNewCriterion, handleDeleteCriterion, handleRenameCriterion,
    basicSkus, setBasicSkus
}) => {
    
    const activeRules = criteria[editingCriterionName];
    const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newNameInput, setNewNameInput] = useState(editingCriterionName);

    useEffect(() => { setNewNameInput(editingCriterionName); }, [editingCriterionName]);

    const handleAddRowRule = () => {
        if (!activeRules) return;
        const newRule: RowRule = { id: Date.now().toString(), age: '', gender: '', productTypes: [] };
        setCriteria({...criteria, [editingCriterionName]: { ...activeRules, rowSequencing: [...activeRules.rowSequencing, newRule] }});
    };

    const handleRemoveRowRule = (index: number) => {
        if (!activeRules) return;
        const nextRows = [...activeRules.rowSequencing];
        nextRows.splice(index, 1);
        setCriteria({...criteria, [editingCriterionName]: { ...activeRules, rowSequencing: nextRows }});
        setConfirmDeleteIdx(null);
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-20 min-[750px]:pb-0">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2 w-full">
                    <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Criterios de Orden</h1>
                    
                    <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm w-fit">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Seleccionar Criterio para Editar</span>
                        <select value={editingCriterionName} onChange={(e) => setEditingCriterionName(e.target.value)} className="bg-slate-50 p-2 rounded-xl text-[11px] font-bold outline-none border-none cursor-pointer">
                            {Object.keys(criteria).map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                        <div className="h-5 w-px bg-slate-100 mx-1"></div>
                        {isRenaming ? (
                            <div className="flex items-center gap-2">
                                <input type="text" value={newNameInput} onChange={e => setNewNameInput(e.target.value)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold outline-none focus:ring-1 focus:ring-blue-300" />
                                <button onClick={() => { handleRenameCriterion(editingCriterionName, newNameInput); setIsRenaming(false); }} className="px-3 py-1 bg-emerald-500 text-white rounded-lg font-bold text-[10px] uppercase">Guardar</button>
                                <button onClick={() => setIsRenaming(false)} className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg font-bold text-[10px] uppercase">Cerrar</button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <button onClick={() => setIsRenaming(true)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] uppercase hover:bg-blue-100 transition-colors">Renombrar</button>
                                {Object.keys(criteria).length > 1 && (
                                    <button onClick={() => handleDeleteCriterion(editingCriterionName)} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg font-bold text-[10px] uppercase hover:bg-rose-100 transition-colors">Eliminar Estrategia</button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="space-y-4">
                <details className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" open>
                    <summary className="p-4 cursor-pointer font-bold text-slate-900 text-[11px] flex items-center gap-2 uppercase tracking-tighter"><ChevronDownIcon /> Criterio Base (prendas abajo de todo)</summary>
                    <div className="p-4 pt-0">
                        <input type="text" value={excludedProductTypes.join(', ')} onChange={e => setExcludedProductTypes(e.target.value.split(',').map(s => s.trim()))} placeholder="PRENDA 1, PRENDA 2, PRENDA 3, PRENDA 4" className="w-full p-3 bg-[#EFEFEF] rounded-xl text-[11px] font-bold outline-none text-slate-700" />
                    </div>
                </details>
                <details className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" open>
                    <summary className="p-4 cursor-pointer font-bold text-slate-900 text-[11px] flex items-center gap-2 uppercase tracking-tighter"><ChevronDownIcon /> Criterio Prendas Básicas (abajo de todo)</summary>
                    <div className="p-4 pt-0">
                        <textarea value={basicSkus.join(', ')} onChange={e => setBasicSkus(e.target.value.split(',').map(s => s.trim()))} placeholder="ej: CHK48011, OSO WHITE COLORS" className="w-full p-4 bg-[#F8D7DA]/30 text-[#721c24] rounded-xl text-[11px] font-bold outline-none min-h-[60px]" />
                    </div>
                </details>
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                     <details open>
                        <summary className="cursor-pointer font-bold text-slate-900 text-[11px] flex items-center justify-between mb-4 uppercase tracking-tighter">
                            <div className="flex items-center gap-2"><ChevronDownIcon /> Criterios de orden Tipos de Prenda</div>
                            <button onClick={handleNewCriterion} className="px-4 py-2 bg-[#262626] text-white font-bold rounded-xl text-[10px] flex items-center gap-2 uppercase"><span className="text-lg">+</span> Nuevo Criterio</button>
                        </summary>
                        <div className="space-y-3">
                            {activeRules?.rowSequencing.map((rule, index) => (
                                <div key={rule.id} className="bg-white flex flex-col md:flex-row md:items-center gap-3 p-2 rounded-xl border border-slate-50 md:border-none">
                                    <span className="text-[11px] font-bold text-rose-500 w-10 shrink-0">Fila {index + 1}</span>
                                    <div className="flex flex-wrap items-center gap-2 flex-grow">
                                        <select value={rule.age} onChange={(e) => {
                                            const nextRows = [...activeRules.rowSequencing];
                                            nextRows[index].age = e.target.value as Age;
                                            setCriteria({...criteria, [editingCriterionName]: { ...activeRules, rowSequencing: nextRows }});
                                        }} className="p-2.5 bg-[#EFEFEF] rounded-xl text-[11px] font-bold outline-none text-slate-800 min-w-[120px]">
                                            <option value="">Edad</option>
                                            {Object.values(Age).map(age => <option key={age} value={age}>{age}</option>)}
                                        </select>
                                        <select value={rule.gender} onChange={(e) => {
                                            const nextRows = [...activeRules.rowSequencing];
                                            nextRows[index].gender = e.target.value as Gender;
                                            setCriteria({...criteria, [editingCriterionName]: { ...activeRules, rowSequencing: nextRows }});
                                        }} className="p-2.5 bg-[#EFEFEF] rounded-xl text-[11px] font-bold outline-none text-slate-800 min-w-[120px]">
                                            <option value="">Género</option>
                                            {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                        <input type="text" placeholder="VESTIDO, REMERA, SHORT..." value={rule.productTypes?.join(', ') || ''} onChange={(e) => {
                                            const nextRows = [...activeRules.rowSequencing];
                                            nextRows[index].productTypes = [e.target.value];
                                            setCriteria({...criteria, [editingCriterionName]: { ...activeRules, rowSequencing: nextRows }});
                                        }} className="flex-grow p-2.5 bg-[#EFEFEF] rounded-xl text-[11px] font-bold outline-none text-slate-700" />
                                        <button onClick={() => setConfirmDeleteIdx(index)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors"><TrashIcon /></button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={handleAddRowRule} className="w-full mt-4 py-3 text-emerald-600 font-bold bg-[#D1E9FF]/40 border-none rounded-xl hover:bg-emerald-50 transition-all uppercase text-[11px] tracking-widest flex items-center justify-center gap-2">Añadir fila <span className="text-lg">⊕</span></button>
                        </div>
                    </details>
                </div>
            </div>
            {confirmDeleteIdx !== null && (
                <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 shadow-2xl max-sm w-full text-center animate-slide-up">
                        <h3 className="text-lg font-black text-slate-900 mb-6">¿Querés eliminar el criterio de la Fila {confirmDeleteIdx + 1}?</h3>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setConfirmDeleteIdx(null)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                            <button onClick={() => handleRemoveRowRule(confirmDeleteIdx!)} className="px-6 py-2 text-rose-500 font-bold hover:bg-rose-50 rounded-xl">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const InstructionsPage: FC<{ initialContent: string; onSave: (content: string) => void }> = ({ initialContent, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    return (
        <div className="flex flex-col h-full space-y-6 animate-fade-in pb-20 min-[750px]:pb-0">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tighter uppercase">Instrucciones</h1>
                 <button onClick={() => { if (isEditing) { onSave(editorRef.current?.innerHTML || ''); setIsEditing(false); } else { setIsEditing(true); } }} className={`px-8 py-2.5 font-bold rounded-xl text-[11px] transition-all shadow-sm uppercase ${isEditing ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-800'}`}>{isEditing ? 'Guardar' : 'Editar'}</button>
            </header>
            <div className={`flex-1 bg-white border transition-all overflow-hidden rounded-3xl shadow-sm ${isEditing ? 'border-emerald-200' : 'border-slate-50'}`}>
                <div ref={editorRef} contentEditable={isEditing} className="p-10 min-[750px]:p-20 h-full overflow-y-auto no-scrollbar outline-none prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: initialContent }} />
            </div>
        </div>
    );
};

const ReplacementModal: FC<{ product: ProductVariant; candidates: ProductVariant[]; excludedProductTypes: string[]; onClose: () => void; onSelect: (replacement: ProductVariant) => void; }> = ({ product, candidates, excludedProductTypes, onClose, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
    const filteredCandidates = candidates.filter(c => { const lower = searchTerm.toLowerCase(); return !searchTerm || c.title.toLowerCase().includes(lower) || c.grupoSku.toLowerCase().includes(lower); });
    const categories = useMemo(() => {
        const cats: ReplacementCategory[] = [];
        const news = filteredCandidates.filter(c => c.newInDate).sort((a,b) => (b.newInDate?.getTime()||0)-(a.newInDate?.getTime()||0));
        if (news.length > 0) cats.push({ id: 'new-in', title: 'NEW IN', items: news });
        const campaigns = new Map<string, ProductVariant[]>();
        filteredCandidates.filter(c => c.mediaType === MediaType.CAMPAIGN).forEach(c => { const name = c.campaignName || 'General'; if (!campaigns.has(name)) campaigns.set(name, []); campaigns.get(name)?.push(c); });
        campaigns.forEach((items, name) => cats.push({ id: `camp-${name}`, title: `FOTO CAMPAÑA: ${name}`, items }));
        cats.push({ id: 'rank', title: 'Ranking Analytics', items: [...filteredCandidates].sort((a,b) => a.rankingAnalytics - b.rankingAnalytics) });
        cats.push({ id: 'stock', title: 'Mayor Stock Ecommerce', items: [...filteredCandidates].sort((a,b) => b.stockEcommerce - a.stockEcommerce) });
        return cats;
    }, [filteredCandidates]);
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                <header className="px-8 py-5 border-b border-slate-50 flex-shrink-0">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Reemplazar Producto</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{product.title} | {product.grupoSku} | {product.color}</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-xl font-light text-slate-400 transition-all">&times;</button>
                    </div>
                    <input type="text" placeholder="Buscar por nombre, SKU o código..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-1 focus:ring-emerald-400 text-[12px] font-bold text-slate-700" />
                </header>
                <main className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                    {categories.map(cat => {
                        const isExpanded = expandedCategoryId === cat.id;
                        return (
                            <div key={cat.id} className="pb-6 border-b border-slate-50 last:border-0">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-black text-[#1e1b4b] text-[11px] uppercase tracking-widest">{cat.title}</h3>
                                    <button onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)} className="text-[9px] font-black text-emerald-500 uppercase hover:underline">{isExpanded ? 'Ver menos' : `Ver más (${cat.items.length})`}</button>
                                </div>
                                <div className={`${isExpanded ? 'grid grid-cols-2 min-[600px]:grid-cols-4 gap-4' : 'flex gap-4 overflow-x-auto no-scrollbar pb-2'}`}>
                                    {cat.items.slice(0, isExpanded ? 50 : 10).map(item => (
                                        <button key={item.id} onClick={() => onSelect(item)} className={`${isExpanded ? 'w-full' : 'w-24 min-[600px]:w-36 flex-shrink-0'} text-left hover:scale-[1.02] transition-all`}>
                                            <div className="aspect-[3/4] bg-[#F5F5F5] rounded-xl overflow-hidden mb-2 border border-slate-100 relative">
                                                {item.mediaType === MediaType.VIDEO ? <OptimizedVideo src={item.imageLink} className="w-full h-full object-cover" /> : <img src={item.imageLink} className="w-full h-full object-cover" loading="lazy" />}
                                                {item.mediaType === MediaType.CAMPAIGN && <div className="absolute top-2 left-2 bg-purple-600 text-white text-[7px] font-bold px-1 py-0.5 rounded uppercase max-w-[90%] truncate">{item.campaignName || 'CAMPAÑA'}</div>}
                                            </div>
                                            <p className="text-[9px] font-black uppercase text-slate-900 truncate leading-tight mb-0.5">{item.title}</p>
                                            <p className="text-[8px] font-bold uppercase text-slate-400 truncate">{item.grupoSku} | {item.color}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </main>
            </div>
        </div>
    );
};

export default function App() {
    const [currentPage, setCurrentPage] = useState<Page>('inicio');
    const [xmlFile, setXmlFile] = useState<File | null>(null);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [allProducts, setAllProducts] = useState<ProductVariant[]>([]);
    const [originalCsvData, setOriginalCsvData] = useState<CsvProduct[]>([]);
    const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [excludedProductTypes, setExcludedProductTypes] = useState<string[]>([]);
    const [basicSkus, setBasicSkus] = useState<string[]>([]);
    const [criteria, setCriteria] = useState<Record<string, SortingRules>>({ 'Default': { rowSequencing: [], logic: SortLogic.SEQUENTIAL } });
    const [activeCriterionName, setActiveCriterionName] = useState<string>('Default');
    const [editingCriterionName, setEditingCriterionName] = useState<string>('Default');

    const [instructionsContent, setInstructionsContent] = useState(() => {
        const saved = localStorage.getItem('cheeky_instructions_v10');
        return saved || `
            <h2 class="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-6 border-b border-slate-100 pb-4">Guía Completa: Orden Sábana Cheeky</h2>
            
            <section class="mb-8">
                <h3 class="text-sm font-black text-slate-800 uppercase mb-3 flex items-center gap-2">
                    <span class="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span> 
                    Carga y Sincronización de Datos (Autoadministrable)
                </h3>
                <p class="mb-3">La herramienta depende de dos archivos clave que usted debe cargar en la sección <strong>Productos</strong>:</p>
                <ul class="list-disc pl-6 space-y-2 mb-4 text-slate-600">
                    <li><strong>XML (Catálogo)</strong>: Contiene descripciones y enlaces de imágenes base del catálogo de Cheeky.</li>
                    <li><strong>CSV (Métricas)</strong>: Esencial para el ranking y stock. Debe contener columnas como 'Grupo (Fórmula)', 'Ranking Analytics', 'STOCK ECOMMERCE', 'Edad', 'Género' y 'Tipo Prenda'.</li>
                </ul>
            </section>
            
            <section class="mb-8">
                <h3 class="text-sm font-black text-slate-800 uppercase mb-3 flex items-center gap-2">
                    <span class="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span> 
                    Estrategias y Criterios de Orden
                </h3>
                <p class="mb-3">En <strong>Criterios de Orden</strong>, usted tiene control total para:</p>
                <ul class="list-disc pl-6 space-y-2 mb-4 text-slate-600">
                    <li><strong>Crear Múltiples Estrategias</strong>: Use el botón '+ Nuevo Criterio' para generar diferentes lógicas de ordenamiento.</li>
                    <li><strong>Editar y Gestionar</strong>: Puede seleccionar una estrategia específica mediante el selector, <strong>Renombrarla</strong> o <strong>Eliminarla</strong> si hay más de una disponible.</li>
                    <li><strong>Reglas por Fila</strong>: Defina qué Edad, Género o Tipo de Prenda debe priorizarse por fila (4 productos).</li>
                    <li><strong>Exclusiones</strong>: Los tipos de prenda o SKUs definidos como 'Básicos' se moverán automáticamente al final del listado para no interferir con las novedades.</li>
                </ul>
            </section>
            
            <section class="mb-8">
                <h3 class="text-sm font-black text-slate-800 uppercase mb-3 flex items-center gap-2">
                    <span class="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">3</span> 
                    Intercalado Inteligente de Contenido Especial
                </h3>
                <p class="mb-3">La herramienta aplica automáticamente una regla de <strong>"1 especial por fila"</strong>:</p>
                <ul class="list-disc pl-6 space-y-2 text-slate-600">
                    <li>Garantiza que en cada fila de 4 productos haya exactamente un contenido de tipo <strong>Campaña, Modelo o Video</strong> (si existe stock).</li>
                    <li>Los otros 3 espacios se completan siguiendo el orden de: New In, Ranking Analytics y Stock Ecommerce.</li>
                </ul>
            </section>

            <section class="mb-8">
                <h3 class="text-sm font-black text-slate-800 uppercase mb-3 flex items-center gap-2">
                    <span class="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">4</span> 
                    Gestión de Productos y Multimedia
                </h3>
                <ul class="list-disc pl-6 space-y-2 text-slate-600">
                    <li><strong>Reemplazo Manual</strong>: Al pasar el mouse sobre un producto, el botón 'Reemplazar' (95% de ancho) permite buscar un sustituto ideal.</li>
                    <li><strong>Drag and Drop</strong>: Puede reordenar manualmente cualquier producto arrastrándolo a su nueva posición.</li>
                    <li><strong>Multimedia Masiva</strong>: Use el botón 'Subir foto/video (masivo)' para vincular archivos locales. Se asociarán automáticamente si el nombre del archivo coincide con el SKU o Código Comercial.</li>
                </ul>
            </section>

            <footer class="mt-12 pt-6 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                Herramienta Optimizada para Cheeky - Versión Pro 2025
            </footer>
        `;
    });

    const [productToReplace, setProductToReplace] = useState<ProductVariant | null>(null);
    const [displayedProducts, setDisplayedProducts] = useState<ProductVariant[]>([]);
    const [draggedItem, setDraggedItem] = useState<ProductVariant | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.excludedProductTypes) setExcludedProductTypes(data.excludedProductTypes);
                if (data.basicSkus) setBasicSkus(data.basicSkus);
                if (data.criteria) setCriteria(data.criteria);
                if (data.activeCriterionName) { setActiveCriterionName(data.activeCriterionName); setEditingCriterionName(data.activeCriterionName); }
                if (data.allProducts) setAllProducts(data.allProducts);
            } catch (e) {}
        }
    }, []);

    useEffect(() => {
        const stateToSave = { excludedProductTypes, basicSkus, criteria, activeCriterionName, allProducts };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [excludedProductTypes, basicSkus, criteria, activeCriterionName, allProducts]);

    const processFiles = useCallback(async (xml: File, csv: File) => {
        setIsLoading(true); setFeedbackMessage(null);
        try {
            const [xmlData, csvParsed] = await Promise.all([parseXML(xml), parseCSV(csv)]);
            const allVariants = synchronizeAndFilterData(xmlData, csvParsed.data);
            setOriginalCsvData(csvParsed.data);
            setAllProducts(allVariants); setOriginalHeaders(csvParsed.headers);
            setFeedbackMessage(`Sincronización exitosa: ${allVariants.length} artículos.`);
        } catch (e) { alert("Fallo en la sincronización."); }
        finally { setIsLoading(false); }
    }, []);

    const handleUploadMedia = (files: File[]) => {
        if (allProducts.length === 0) return;
        const updated = matchFilesToProducts(files, allProducts);
        setAllProducts(updated);
        setFeedbackMessage(`Multimedia vinculada: ${files.length} archivos procesados.`);
    };

    const sortedProductsFromLogic = useMemo(() => {
        if (!allProducts.length) return [];
        return sortProducts(allProducts, criteria[activeCriterionName], excludedProductTypes, basicSkus);
    }, [allProducts, criteria, activeCriterionName, excludedProductTypes, basicSkus]);

    useEffect(() => { setDisplayedProducts(sortedProductsFromLogic); }, [sortedProductsFromLogic]);

    const handleExportCSV = () => {
        if (!displayedProducts.length || !originalCsvData.length) return;
        const exportedRows = displayedProducts.map((variant, idx) => {
            const matchingOriginalRows = originalCsvData.filter(r => r['Grupo (Fórmula)']?.replace(/%/g, '') === variant.id);
            return matchingOriginalRows.map(origRow => {
                const rowValues = [idx + 1, !variant.hasImage ? 'Sin Imagen' : !variant.hasStock ? 'Sin Stock' : 'OK', variant.sortReason || 'N/A', ...originalHeaders.map(h => origRow[h as keyof CsvProduct] || '')];
                return rowValues.map(v => `"${v.toString().replace(/"/g, '""')}"`).join(',');
            }).join('\n');
        });
        const csvContent = "\uFEFF" + [['Orden', 'Estado', 'Criterio', ...originalHeaders].join(','), ...exportedRows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `cheeky_export_${new Date().getTime()}.csv`; link.click();
    };

    const handleNewCriterion = () => {
        const name = `Estrategia ${Object.keys(criteria).length + 1}`;
        setCriteria({...criteria, [name]: { rowSequencing: [], logic: SortLogic.SEQUENTIAL }});
        setActiveCriterionName(name); setEditingCriterionName(name);
    };

    const handleDeleteCriterion = (name: string) => {
        if (Object.keys(criteria).length <= 1) return;
        const nextCriteria = { ...criteria }; delete nextCriteria[name];
        const remainingNames = Object.keys(nextCriteria);
        setCriteria(nextCriteria); setActiveCriterionName(remainingNames[0]); setEditingCriterionName(remainingNames[0]);
    };

    const handleRenameCriterion = (oldName: string, newName: string) => {
        if (!newName || newName === oldName || criteria[newName]) return;
        const nextCriteria = { ...criteria }; nextCriteria[newName] = nextCriteria[oldName]; delete nextCriteria[oldName];
        setCriteria(nextCriteria); if (activeCriterionName === oldName) setActiveCriterionName(newName); setEditingCriterionName(newName);
    };

    return (
        <div className="min-h-screen bg-white flex flex-col min-[750px]:flex-row font-sans antialiased text-slate-800">
            <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
            <main className="flex-1 bg-white p-6 min-[750px]:p-12 min-[750px]:ml-64 overflow-y-auto no-scrollbar min-h-screen">
                {currentPage === 'inicio' && (
                    <HomePage products={displayedProducts} onUploadXML={setXmlFile} onUploadCSV={setCsvFile} onUploadMedia={handleUploadMedia} onProcessFiles={() => processFiles(xmlFile!, csvFile!)} onExportCSV={handleExportCSV} onReplaceProduct={setProductToReplace} xmlFile={xmlFile} csvFile={csvFile} isLoading={isLoading} criteria={criteria} activeCriterionName={activeCriterionName} setActiveCriterionName={(name) => { setActiveCriterionName(name); setEditingCriterionName(name); }} feedbackMessage={feedbackMessage} draggedItem={draggedItem} onDragStart={setDraggedItem} onDragEnd={() => setDraggedItem(null)} onDrop={target => {
                            if (!draggedItem) return;
                            const newItems = [...displayedProducts];
                            const fromIdx = newItems.findIndex(p => p.id === draggedItem.id);
                            const toIdx = newItems.findIndex(p => p.id === target.id);
                            if (fromIdx > -1 && toIdx > -1) { const [removed] = newItems.splice(fromIdx, 1); newItems.splice(toIdx, 0, removed); setDisplayedProducts(newItems); setAllProducts(newItems); }
                        }} />
                )}
                {currentPage === 'criterios' && <CriteriaPage excludedProductTypes={excludedProductTypes} setExcludedProductTypes={setExcludedProductTypes} criteria={criteria} setCriteria={setCriteria} editingCriterionName={editingCriterionName} setEditingCriterionName={setEditingCriterionName} handleNewCriterion={handleNewCriterion} handleDeleteCriterion={handleDeleteCriterion} handleRenameCriterion={handleRenameCriterion} basicSkus={basicSkus} setBasicSkus={setBasicSkus} />}
                {currentPage === 'instrucciones' && <InstructionsPage initialContent={instructionsContent} onSave={c => { setInstructionsContent(c); localStorage.setItem('cheeky_instructions_v10', c); }} />}
            </main>
            {productToReplace && (
                <ReplacementModal product={productToReplace} candidates={allProducts} excludedProductTypes={excludedProductTypes} onClose={() => setProductToReplace(null)} onSelect={replacement => {
                    const next = [...displayedProducts];
                    const fromIdx = next.findIndex(p => p.id === productToReplace.id);
                    const toIdx = next.findIndex(p => p.id === replacement.id);
                    if (fromIdx > -1 && toIdx > -1) { const temp = next[fromIdx]; next[fromIdx] = next[toIdx]; next[toIdx] = temp; setDisplayedProducts(next); setAllProducts(next); }
                    setProductToReplace(null);
                }} />
            )}
            <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } @keyframes slide-up { from { transform: translateY(10%); opacity: 0; } to { transform: translateY(0); opacity: 1; } } .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); } @keyframes fade-in { from { opacity: 0; } to { transform: translateY(0); opacity: 1; } } .animate-fade-in { animation: fade-in 0.4s ease-out; }` }} />
        </div>
    );
}
