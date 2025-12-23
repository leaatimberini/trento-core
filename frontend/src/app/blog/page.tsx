'use client';

import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import AuthGuard from '../../components/AuthGuard';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { FileText, BookOpen, Mail, Share2, Plus, Wand2, Eye, Users, X, Loader2, Trash2, Globe } from 'lucide-react';

interface Article {
    id: string;
    title: string;
    content: string;
    status: 'DRAFT' | 'PUBLISHED';
    createdAt: string;
}

interface Recipe {
    id: string;
    name: string;
    ingredients: string[];
    instructions: string;
    createdAt: string;
}

// localStorage keys
const ARTICLES_KEY = 'trento_blog_articles';
const RECIPES_KEY = 'trento_blog_recipes';

export default function BlogPage() {
    const [activeTab, setActiveTab] = useState('posts');
    const [articles, setArticles] = useState<Article[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);

    // Modal states
    const [showArticleModal, setShowArticleModal] = useState(false);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [showAIRecipeModal, setShowAIRecipeModal] = useState(false);

    // Form states
    const [articleForm, setArticleForm] = useState({ title: '', content: '' });
    const [recipeForm, setRecipeForm] = useState({ name: '', ingredients: '', instructions: '' });
    const [aiPrompt, setAIPrompt] = useState('');
    const [aiRecipePrompt, setAIRecipePrompt] = useState('');
    const [aiGenerating, setAIGenerating] = useState(false);
    const [message, setMessage] = useState('');

    // Load from localStorage on mount
    useEffect(() => {
        const savedArticles = localStorage.getItem(ARTICLES_KEY);
        const savedRecipes = localStorage.getItem(RECIPES_KEY);

        if (savedArticles) {
            try {
                setArticles(JSON.parse(savedArticles));
            } catch (e) {
                console.error('Error loading articles:', e);
            }
        }

        if (savedRecipes) {
            try {
                setRecipes(JSON.parse(savedRecipes));
            } catch (e) {
                console.error('Error loading recipes:', e);
            }
        }
    }, []);

    // Save to localStorage whenever articles change
    useEffect(() => {
        if (articles.length > 0) {
            localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
        }
    }, [articles]);

    // Save to localStorage whenever recipes change
    useEffect(() => {
        if (recipes.length > 0) {
            localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
        }
    }, [recipes]);

    const tabs = [
        { id: 'posts', label: 'Artículos', icon: FileText },
        { id: 'recipes', label: 'Recetas', icon: BookOpen },
        { id: 'newsletter', label: 'Newsletter', icon: Mail },
        { id: 'social', label: 'Redes Sociales', icon: Share2 },
    ];

    // Create Article
    const handleCreateArticle = () => {
        if (!articleForm.title) {
            setMessage('El título es requerido');
            return;
        }

        const newArticle: Article = {
            id: `article-${Date.now()}`,
            title: articleForm.title,
            content: articleForm.content,
            status: 'DRAFT',
            createdAt: new Date().toISOString()
        };

        const updatedArticles = [newArticle, ...articles];
        setArticles(updatedArticles);
        localStorage.setItem(ARTICLES_KEY, JSON.stringify(updatedArticles));

        setShowArticleModal(false);
        setArticleForm({ title: '', content: '' });
        setMessage('✅ Artículo creado y guardado');
    };

    // Create Recipe
    const handleCreateRecipe = () => {
        if (!recipeForm.name) {
            setMessage('El nombre es requerido');
            return;
        }

        const newRecipe: Recipe = {
            id: `recipe-${Date.now()}`,
            name: recipeForm.name,
            ingredients: recipeForm.ingredients.split('\n').filter(i => i.trim()),
            instructions: recipeForm.instructions,
            createdAt: new Date().toISOString()
        };

        const updatedRecipes = [newRecipe, ...recipes];
        setRecipes(updatedRecipes);
        localStorage.setItem(RECIPES_KEY, JSON.stringify(updatedRecipes));

        setShowRecipeModal(false);
        setRecipeForm({ name: '', ingredients: '', instructions: '' });
        setMessage('✅ Receta creada y guardada');
    };

    // Generate recipe with AI
    const handleAIRecipeGenerate = async () => {
        if (!aiRecipePrompt) {
            setMessage('Ingresa un nombre de trago para generar');
            return;
        }

        setAIGenerating(true);
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Normalize input for matching
        const normalizedPrompt = aiRecipePrompt.toLowerCase().trim();

        const aiRecipes: { [key: string]: { ingredients: string[], instructions: string } } = {
            'mojito': {
                ingredients: [
                    '50ml Ron blanco',
                    '25ml Jugo de lima fresco',
                    '2 cucharaditas de azúcar',
                    '6-8 hojas de menta fresca',
                    'Soda o agua con gas',
                    'Hielo picado',
                    'Rodaja de lima para decorar'
                ],
                instructions: `1. Colocá las hojas de menta en un vaso alto junto con el azúcar y el jugo de lima.\n\n2. Macerá suavemente con un mortero para liberar los aceites de la menta (no tritutes, solo presioná).\n\n3. Agregá el ron blanco y mezclá bien.\n\n4. Llenás el vaso con hielo picado.\n\n5. Completá con soda hasta el tope.\n\n6. Revolvé suavemente y decorá con una rodaja de lima y una ramita de menta.\n\n**Tip profesional:** Usá menta fresca, nunca seca. La diferencia es abismal.`
            },
            'margarita': {
                ingredients: [
                    '50ml Tequila blanco',
                    '25ml Triple Sec o Cointreau',
                    '25ml Jugo de lima fresco',
                    'Sal para escarchar',
                    'Rodaja de lima',
                    'Hielo'
                ],
                instructions: `1. Pasá una rodaja de lima por el borde de la copa.\n\n2. Sumergí el borde en sal para escarcharlo.\n\n3. En una coctelera con hielo, agregá el tequila, triple sec y jugo de lima.\n\n4. Agitá vigorosamente durante 15 segundos.\n\n5. Colá en la copa escarchada.\n\n6. Decorá con una rodaja de lima.`
            },
            'margarita frozen': {
                ingredients: [
                    '50ml Tequila blanco',
                    '25ml Triple Sec o Cointreau',
                    '30ml Jugo de lima fresco',
                    '15ml Almíbar simple',
                    '1 taza de hielo',
                    'Sal para escarchar',
                    'Rodaja de lima'
                ],
                instructions: `1. Pasá una rodaja de lima por el borde de la copa margarita.\n\n2. Sumergí el borde en sal para escarcharlo.\n\n3. En la licuadora, agregá el tequila, triple sec, jugo de lima y almíbar.\n\n4. Agregá el hielo y licuá hasta obtener una textura de granizado suave.\n\n5. Serví en la copa escarchada.\n\n6. Decorá con una rodaja de lima.\n\n**Tip:** Podés agregar frutillas, mango o sandía para versiones frutadas.`
            },
            'negroni': {
                ingredients: [
                    '30ml Gin London Dry',
                    '30ml Campari',
                    '30ml Vermut Rojo dulce',
                    'Cáscara de naranja',
                    'Hielo en cubos grandes'
                ],
                instructions: `1. Enfriá un vaso old fashioned con hielo.\n\n2. Descartá el hielo y agregá hielo fresco (preferiblemente un cubo grande).\n\n3. Vertí el gin, el Campari y el vermut directamente en el vaso.\n\n4. Revolvé suavemente durante 30 segundos.\n\n5. Expresá la cáscara de naranja sobre el trago para liberar los aceites esenciales.\n\n6. Dejá la cáscara como decoración.\n\n**Dato curioso:** El Negroni nació en Florencia en 1919.`
            },
            'daiquiri': {
                ingredients: [
                    '60ml Ron blanco cubano',
                    '30ml Jugo de lima fresco',
                    '20ml Almíbar simple (2:1)',
                    'Hielo',
                    'Rodaja de lima para decorar'
                ],
                instructions: `1. En una coctelera, agregá el ron, el jugo de lima y el almíbar.\n\n2. Llenás con hielo y agitá vigorosamente durante 15 segundos.\n\n3. Doble colado en una copa coupette previamente enfriada.\n\n4. Decorá con una rueda de lima.\n\n**Almíbar simple 2:1:** 2 partes de azúcar por 1 de agua caliente. Mezclá hasta disolver.\n\n**Historia:** Creado en Cuba, era el trago favorito de Ernest Hemingway.`
            },
            'daiquiri frozen': {
                ingredients: [
                    '60ml Ron blanco',
                    '30ml Jugo de lima fresco',
                    '25ml Almíbar simple',
                    '1 taza de hielo (aprox. 150g)',
                    'Rodaja de lima para decorar'
                ],
                instructions: `1. Agregá todos los ingredientes líquidos a la licuadora.\n\n2. Añadí el hielo.\n\n3. Licuá a velocidad alta durante 15-20 segundos hasta obtener una textura de granizado suave y homogénea.\n\n4. Serví inmediatamente en una copa coupette o vaso hurricane.\n\n5. Decorá con una rodaja de lima en el borde.\n\n**Variaciones populares:**\n- Frutilla Frozen: Agregá 4-5 frutillas frescas\n- Banana Frozen: Agregá media banana madura\n- Mango Frozen: Agregá 1/2 taza de mango\n\n**Tip:** Usá ron blanco de buena calidad. El Havana Club 3 años es clásico.`
            },
            'aperol spritz': {
                ingredients: [
                    '90ml Prosecco',
                    '60ml Aperol',
                    '30ml Soda',
                    'Rodaja de naranja',
                    'Hielo',
                    'Aceituna verde (opcional)'
                ],
                instructions: `1. Llenás una copa de vino grande con cubos de hielo.\n\n2. Vertí primero el Prosecco.\n\n3. Agregá el Aperol suavemente.\n\n4. Completá con un splash de soda.\n\n5. Decorá con media rodaja de naranja.\n\n**El orden importa:** Prosecco primero, luego Aperol. Esto crea la mezcla perfecta de colores.\n\n**Proporción clásica:** 3-2-1 (Prosecco-Aperol-Soda).`
            },
            'gin tonic': {
                ingredients: [
                    '50ml Gin premium',
                    '150ml Agua tónica de calidad',
                    'Garnish a elección (limón, pepino, romero)',
                    'Hielo en abundancia'
                ],
                instructions: `1. Enfriá una copa balón con hielo y agua. Descartá.\n\n2. Llenás la copa con hielo hasta el tope.\n\n3. Vertí el gin dejándolo caer sobre el hielo.\n\n4. Agregá la tónica suavemente por el borde de la copa para preservar las burbujas.\n\n5. Con una cuchara larga, hacé UN solo movimiento de abajo hacia arriba.\n\n6. Añadí el garnish elegido.\n\n**Proporción:** 1:3 (gin:tónica). Ajustá según preferencia.`
            },
            'piña colada': {
                ingredients: [
                    '60ml Ron blanco',
                    '90ml Jugo de ananá',
                    '30ml Crema de coco',
                    '1 taza de hielo',
                    'Rodaja de ananá para decorar',
                    'Cereza marrasquino'
                ],
                instructions: `1. Agregá el ron, jugo de ananá y crema de coco a la licuadora.\n\n2. Añadí el hielo.\n\n3. Licuá hasta obtener una textura cremosa y suave.\n\n4. Serví en un vaso hurricane o copa grande.\n\n5. Decorá con una rodaja de ananá y una cereza.\n\n**Tip:** Podés usar ananá fresco en lugar de jugo para más sabor.\n\n**Historia:** Creada en Puerto Rico en 1954.`
            },
            'piña colada frozen': {
                ingredients: [
                    '60ml Ron blanco',
                    '90ml Jugo de ananá natural',
                    '45ml Crema de coco',
                    '1.5 tazas de hielo',
                    'Trozos de ananá fresco (opcional)',
                    'Rodaja de ananá y cereza para decorar'
                ],
                instructions: `1. Agregá el ron, jugo de ananá y crema de coco a la licuadora.\n\n2. Si usás ananá fresco, agregá algunos trozos.\n\n3. Añadí el hielo.\n\n4. Licuá a velocidad alta hasta obtener textura de helado suave.\n\n5. Serví en un vaso hurricane.\n\n6. Decorá con ananá y cereza.\n\n**Versión virgin:** Omití el ron para una versión sin alcohol.`
            },
            'caipirinha': {
                ingredients: [
                    '60ml Cachaça',
                    '1 lima cortada en gajos',
                    '2 cucharadas de azúcar',
                    'Hielo picado'
                ],
                instructions: `1. Cortá la lima en 8 gajos, retirando el centro blanco.\n\n2. Colocá los gajos en un vaso old fashioned.\n\n3. Agregá el azúcar.\n\n4. Macerá con fuerza para extraer todo el jugo y los aceites de la cáscara.\n\n5. Agregá la cachaça.\n\n6. Llenás con hielo picado.\n\n7. Revolvé bien y serví.\n\n**Importante:** Usá cachaça, no ron. Es el destilado brasileño de caña de azúcar.`
            },
            'cuba libre': {
                ingredients: [
                    '50ml Ron dorado o añejo',
                    '120ml Coca-Cola',
                    '15ml Jugo de lima fresco',
                    '2 gajos de lima',
                    'Hielo'
                ],
                instructions: `1. Llenás un vaso highball con hielo.\n\n2. Agregá el ron.\n\n3. Exprimí los gajos de lima y dejalos en el vaso.\n\n4. Agregá el jugo de lima.\n\n5. Completá con Coca-Cola.\n\n6. Revolvé suavemente.\n\n**Historia:** Creado en Cuba después de la independencia. "Cuba Libre" significa "Cuba libre".`
            },
            'cosmopolitan': {
                ingredients: [
                    '40ml Vodka cítrico',
                    '15ml Triple Sec',
                    '15ml Jugo de lima fresco',
                    '30ml Jugo de arándanos',
                    'Cáscara de naranja o lima'
                ],
                instructions: `1. Enfriá una copa martini.\n\n2. En una coctelera con hielo, agregá el vodka, triple sec, jugo de lima y jugo de arándanos.\n\n3. Agitá vigorosamente durante 15 segundos.\n\n4. Doble colado en la copa enfriada.\n\n5. Expresá la cáscara de naranja sobre el trago.\n\n**Icónico de los 90s:** Popularizado por la serie Sex and the City.`
            },
            'old fashioned': {
                ingredients: [
                    '60ml Bourbon o Rye whiskey',
                    '1 cubo de azúcar o 10ml almíbar simple',
                    '2-3 dashes de Angostura bitters',
                    'Cáscara de naranja',
                    '1 cubo de hielo grande'
                ],
                instructions: `1. Colocá el cubo de azúcar en un vaso old fashioned.\n\n2. Añadí los bitters directamente sobre el azúcar.\n\n3. Agregá unas gotas de agua y mezclá hasta disolver.\n\n4. Añadí el whiskey.\n\n5. Poné un cubo grande de hielo.\n\n6. Revolvé suavemente durante 30 segundos.\n\n7. Expresá la cáscara de naranja y dejala en el vaso.\n\n**Clásico atemporal:** Uno de los cócteles más antiguos, creado en 1880.`
            },
            'whiskey sour': {
                ingredients: [
                    '50ml Bourbon',
                    '25ml Jugo de limón fresco',
                    '20ml Almíbar simple',
                    '15ml Clara de huevo (opcional)',
                    'Cereza y naranja para decorar'
                ],
                instructions: `1. Dry shake (sin hielo) todos los ingredientes incluyendo la clara durante 15 segundos.\n\n2. Agregá hielo y agitá nuevamente por 15 segundos.\n\n3. Colá en un vaso old fashioned con hielo.\n\n4. Decorá con cereza y media rodaja de naranja.\n\n**Sin clara:** Podés omitirla, pero la versión con clara tiene mejor textura.\n\n**Alternativa:** Usá aquafaba (agua de garbanzos) como sustituto vegano de la clara.`
            },
            'manhattan': {
                ingredients: [
                    '60ml Rye whiskey o Bourbon',
                    '30ml Vermut rojo dulce',
                    '2 dashes Angostura bitters',
                    'Cereza marrasquino'
                ],
                instructions: `1. Enfriá una copa coupette o martini.\n\n2. En un vaso mezclador con hielo, agregá el whiskey, vermut y bitters.\n\n3. Revolvé suavemente durante 30-40 segundos.\n\n4. Colá en la copa enfriada.\n\n5. Decorá con la cereza.\n\n**Variaciones:**\n- Perfect Manhattan: mitad vermut dulce, mitad seco\n- Rob Roy: con Scotch en vez de Rye`
            },
            'moscow mule': {
                ingredients: [
                    '50ml Vodka',
                    '15ml Jugo de lima fresco',
                    '120ml Ginger beer',
                    'Rodaja de lima',
                    'Hielo'
                ],
                instructions: `1. Llenás una taza de cobre (copper mug) con hielo.\n\n2. Agregá el vodka.\n\n3. Añadí el jugo de lima.\n\n4. Completá con ginger beer.\n\n5. Revolvé suavemente.\n\n6. Decorá con una rodaja de lima.\n\n**La taza de cobre:** No es solo estética, mantiene el trago más frío.`
            },
            'espresso martini': {
                ingredients: [
                    '50ml Vodka',
                    '30ml Licor de café (Kahlúa)',
                    '30ml Espresso recién hecho',
                    '10ml Almíbar simple',
                    '3 granos de café para decorar'
                ],
                instructions: `1. Prepará el espresso y dejalo enfriar un poco.\n\n2. En una coctelera con hielo, agregá el vodka, licor de café, espresso y almíbar.\n\n3. Agitá vigorosamente durante 15-20 segundos (esto crea la crema).\n\n4. Doble colado en una copa martini enfriada.\n\n5. Decorá con 3 granos de café.\n\n**Tip:** El espresso debe ser fuerte y recién hecho para mejor crema.`
            },
            'bloody mary': {
                ingredients: [
                    '50ml Vodka',
                    '100ml Jugo de tomate',
                    '15ml Jugo de limón',
                    '3 dashes salsa Worcestershire',
                    '2 dashes Tabasco',
                    'Sal y pimienta',
                    'Apio y limón para decorar'
                ],
                instructions: `1. En un vaso highball con hielo, agregá el vodka.\n\n2. Añadí el jugo de tomate.\n\n3. Agregá el jugo de limón, Worcestershire y Tabasco.\n\n4. Sazoná con sal y pimienta al gusto.\n\n5. Revolvé bien.\n\n6. Decorá con un tallo de apio y rodaja de limón.\n\n**Brunch clásico:** Perfecto para después de una noche larga.`
            },
            'sex on the beach': {
                ingredients: [
                    '40ml Vodka',
                    '20ml Licor de durazno',
                    '60ml Jugo de naranja',
                    '60ml Jugo de arándanos',
                    'Rodaja de naranja',
                    'Cereza'
                ],
                instructions: `1. Llenás un vaso highball con hielo.\n\n2. Agregá el vodka y el licor de durazno.\n\n3. Añadí el jugo de naranja.\n\n4. Con cuidado, vertí el jugo de arándanos para crear un degradé.\n\n5. Decorá con naranja y cereza.\n\n**Tip:** No revuelvas para mantener el efecto visual de capas.`
            },
            'long island iced tea': {
                ingredients: [
                    '15ml Vodka',
                    '15ml Ron blanco',
                    '15ml Tequila blanco',
                    '15ml Gin',
                    '15ml Triple Sec',
                    '25ml Jugo de limón',
                    '30ml Almíbar simple',
                    'Splash de Coca-Cola',
                    'Rodaja de limón'
                ],
                instructions: `1. En un vaso highball con hielo, agregá todos los destilados.\n\n2. Añadí el triple sec, jugo de limón y almíbar.\n\n3. Revolvé bien.\n\n4. Completá con un splash de Coca-Cola (solo para el color).\n\n5. Decorá con rodaja de limón.\n\n**Advertencia:** Aunque parece té helado, es MUY fuerte (5 destilados).`
            },
            'tequila sunrise': {
                ingredients: [
                    '45ml Tequila blanco',
                    '90ml Jugo de naranja fresco',
                    '15ml Granadina',
                    'Rodaja de naranja',
                    'Cereza',
                    'Hielo'
                ],
                instructions: `1. Llenás un vaso highball con hielo.\n\n2. Agregá el tequila.\n\n3. Añadí el jugo de naranja.\n\n4. Revolvé suavemente.\n\n5. Vertí la granadina lentamente por el borde del vaso. Se hundirá creando el efecto amanecer.\n\n6. Decorá con naranja y cereza.\n\n**No revuelvas:** El efecto degradé es lo que hace especial a este trago.`
            },
            'mai tai': {
                ingredients: [
                    '30ml Ron blanco',
                    '30ml Ron oscuro',
                    '15ml Curaçao naranja',
                    '15ml Almíbar de orgeat (almendra)',
                    '25ml Jugo de lima fresco',
                    'Ramita de menta',
                    'Rodaja de lima'
                ],
                instructions: `1. En una coctelera con hielo, agregá el ron blanco, curaçao, orgeat y jugo de lima.\n\n2. Agitá vigorosamente durante 15 segundos.\n\n3. Colá en un vaso old fashioned con hielo picado.\n\n4. Hacé flotar el ron oscuro por encima.\n\n5. Decorá con menta y lima.\n\n**Tiki clásico:** Creado en Oakland, California en 1944.`
            }
        };

        // Find matching recipe (case insensitive)
        const matchedKey = Object.keys(aiRecipes).find(key =>
            key.toLowerCase() === normalizedPrompt ||
            normalizedPrompt.includes(key.toLowerCase()) ||
            key.toLowerCase().includes(normalizedPrompt)
        );

        if (!matchedKey) {
            // Don't invent recipes - show available options
            setAIGenerating(false);
            setMessage(`❌ No tenemos la receta de "${aiRecipePrompt}". Probá con: Mojito, Margarita, Daiquiri Frozen, Aperol Spritz, Piña Colada, Negroni, Cosmopolitan, Old Fashioned, etc.`);
            return;
        }

        const recipe = aiRecipes[matchedKey];

        const newRecipe: Recipe = {
            id: `recipe-${Date.now()}`,
            name: matchedKey.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            createdAt: new Date().toISOString()
        };

        const updatedRecipes = [newRecipe, ...recipes];
        setRecipes(updatedRecipes);
        localStorage.setItem(RECIPES_KEY, JSON.stringify(updatedRecipes));

        setShowAIRecipeModal(false);
        setAIRecipePrompt('');
        setMessage('✅ Receta generada');
        setAIGenerating(false);
    };

    // Toggle article status
    const toggleArticleStatus = (articleId: string) => {
        const updatedArticles: Article[] = articles.map(a => {
            if (a.id === articleId) {
                const newStatus: 'DRAFT' | 'PUBLISHED' = a.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
                return { ...a, status: newStatus };
            }
            return a;
        });
        setArticles(updatedArticles);
        localStorage.setItem(ARTICLES_KEY, JSON.stringify(updatedArticles));
        setMessage('✅ Estado actualizado');
    };

    // Delete article
    const deleteArticle = (articleId: string) => {
        const updatedArticles = articles.filter(a => a.id !== articleId);
        setArticles(updatedArticles);
        localStorage.setItem(ARTICLES_KEY, JSON.stringify(updatedArticles));
        setMessage('✅ Artículo eliminado');
    };

    // Delete recipe
    const deleteRecipe = (recipeId: string) => {
        const updatedRecipes = recipes.filter(r => r.id !== recipeId);
        setRecipes(updatedRecipes);
        localStorage.setItem(RECIPES_KEY, JSON.stringify(updatedRecipes));
        setMessage('✅ Receta eliminada');
    };

    // Generate with AI - Uses real AI API
    const handleAIGenerate = async () => {
        if (!aiPrompt) {
            setMessage('Ingresa un tema para generar');
            return;
        }

        setAIGenerating(true);

        try {
            // Uses backend API via api service
            const newPost = await api.generateBlogContent(aiPrompt);

            // Convert backend post format to local Article interface if needed
            // Or just use the returned object if it matches closely enough.
            // Backend returns BlogPost: { id, title, content, slug, status, ... }
            // Local Article: { id, title, content, status }

            const newArticle: Article = {
                id: newPost.id,
                title: newPost.title,
                content: newPost.content,
                status: 'DRAFT', // It comes as draft from backend usually
                createdAt: newPost.createdAt || new Date().toISOString()
            };

            const updatedArticles = [newArticle, ...articles];
            setArticles(updatedArticles);
            // We still update local storage for "offline" mixed mode, but backend is source of truth ideally.
            // For now, let's keep the hybrid approach as user seems to rely on "drafts".
            localStorage.setItem(ARTICLES_KEY, JSON.stringify(updatedArticles));

            setShowAIModal(false);
            setAIPrompt('');
            setMessage('✅ Artículo generado en Backend');
        } catch (error) {
            console.error('AI Generation error:', error);
            setMessage('❌ Error al generar con IA');
        }

        setAIGenerating(false);
    };

    // Fallback content generator when AI is unavailable
    const generateFallbackContent = (topic: string): string => {
        const lowerTopic = topic.toLowerCase();

        // Fernet and amaro
        if (lowerTopic.includes('fernet') || lowerTopic.includes('branca')) {
            return `# ${topic}: El Amargo Preferido de los Argentinos

## Historia del Fernet

El Fernet nació en Milán, Italia, en 1845, creado por Bernardino Branca. Este amaro italiano llegó a Argentina con la inmigración italiana y se convirtió en parte fundamental de nuestra cultura de bebidas.

## Características

- **Tipo:** Amaro (licor amargo)
- **Graduación:** 39-45% según la marca
- **Sabor:** Amargo intenso, mentolado, con notas herbales
- **Color:** Marrón oscuro, casi negro
- **Botánicos:** Más de 27 hierbas y especias (mirra, azafrán, manzanilla, cardamomo, aloe vera, entre otros)

## Cómo Tomarlo

### Fernet con Coca
El clásico argentino:
1. Vaso largo con mucho hielo
2. 30-50ml de Fernet
3. Completar con Coca-Cola (proporción 1:3)
4. Revolver suavemente

### Solo o con hielo
Para los que disfrutan su sabor intenso, servir bien frío en vaso corto.

### Digestivo
Tradicionalmente se toma después de las comidas como digestivo, a temperatura ambiente.

## Marcas Populares en Argentina

- **Fernet Branca:** El original italiano, el más vendido
- **Fernet 1882:** Versión argentina más suave
- **Fernet Vittone:** Opción económica
- **Branca Menta:** Versión mentolada

## Datos Curiosos

- Argentina consume más del 75% del Fernet Branca producido mundialmente
- Córdoba es la provincia donde más se consume
- El Fernet con Coca es tan argentino que Branca produce una versión especial para nuestro mercado

## Conservación

Guardar a temperatura ambiente, lejos de la luz solar. Una vez abierto, mantiene su calidad por años.

## En Trento Bebidas

Encontrá Fernet Branca y todas las variedades de amargos italianos. ¡Precios especiales para mayoristas!`;
        }

        // Aperitivos
        if (lowerTopic.includes('aperol') || lowerTopic.includes('campari') || lowerTopic.includes('cynar')) {
            return `# ${topic}: El Arte del Aperitivo Italiano

## Sobre ${topic}

${topic} es uno de los aperitivos italianos más reconocidos a nivel mundial. Su sabor único lo ha convertido en la base de cócteles icónicos.

## Características

- **Origen:** Italia
- **Tipo:** Aperitivo/Bitter
- **Color:** Distintivo tono naranja/rojo
- **Sabor:** Amargo equilibrado con notas cítricas y herbales

## Cócteles Clásicos

### Spritz
El aperitivo perfecto:
- 90ml Prosecco
- 60ml ${topic}
- Splash de soda
- Rodaja de naranja
- Hielo en copa de vino

### Negroni (con Campari)
- 30ml Gin
- 30ml Campari
- 30ml Vermut rojo
- Cáscara de naranja

## Momento Ideal

El aperitivo italiano se disfruta antes de las comidas principales, entre las 18:00 y 20:00 hs. Es un momento social para compartir con amigos.

## Disponible en Trento Bebidas

Descubrí nuestra selección completa de aperitivos italianos. ¡Consultanos por precios mayoristas!`;
        }

        // Default beverage article
        return `# ${topic}: Guía Completa

## Introducción

${topic} es una bebida con características únicas que ha ganado popularidad entre los conocedores. En esta guía te contamos todo lo que necesitás saber.

## Características Principales

Este producto se destaca por su perfil de sabor único, resultado de un proceso de elaboración cuidadoso y materias primas de calidad.

## Cómo Disfrutarlo

### Solo
Servir a la temperatura recomendada para apreciar todas sus notas aromáticas.

### En Cócteles
${topic} puede ser la base o complemento de diversos cócteles clásicos y de autor.

## Maridaje Sugerido

Combiná ${topic} con alimentos que complementen su perfil de sabor. Consultá con nuestros expertos para recomendaciones personalizadas.

## Conservación

Almacenar en lugar fresco y seco, alejado de la luz solar directa.

## En Trento Bebidas

Encontrá ${topic} y mucho más en nuestro catálogo. Precios especiales para comercios y gastronómicos.

¡Consultanos!`;
    };

    // Clear message after 3 seconds
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const publishedCount = articles.filter(a => a.status === 'PUBLISHED').length;

    return (
        <AuthGuard>
            <DashboardLayout>
                {/* Message Toast */}
                {message && (
                    <div className="fixed top-4 right-4 z-50 bg-neutral-900 border border-white/10 px-4 py-3 rounded-xl shadow-xl">
                        <p className="text-white">{message}</p>
                    </div>
                )}

                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white">Blog & Marketing</h1>
                        <p className="text-gray-400">Contenido, recetas y marketing automático</p>
                    </div>
                    <div className="flex gap-3">
                        <a
                            href="/noticias"
                            target="_blank"
                            className="flex items-center gap-2 bg-white/5 text-gray-300 px-4 py-2 rounded-xl font-bold hover:bg-white/10 transition-all border border-white/10"
                        >
                            <Globe size={18} />
                            Ver Blog Público
                        </a>
                        <button
                            onClick={() => setShowArticleModal(true)}
                            className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded-xl font-bold hover:bg-amber-400 transition-all"
                        >
                            <Plus size={20} />
                            Crear Contenido
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                                <FileText size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{articles.length}</p>
                        <p className="text-sm text-gray-400">Artículos ({publishedCount} publicados)</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400">
                                <BookOpen size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-orange-400">{recipes.length}</p>
                        <p className="text-sm text-gray-400">Recetas</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                                <Eye size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-purple-400">0</p>
                        <p className="text-sm text-gray-400">Visitas</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                                <Users size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-emerald-400">0</p>
                        <p className="text-sm text-gray-400">Suscriptores</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/5">
                    <div className="border-b border-white/10">
                        <nav className="flex space-x-4 px-6" aria-label="Tabs">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items - center gap - 2 py - 4 px - 3 border - b - 2 font - medium text - sm transition - all ${activeTab === tab.id
                                            ? 'border-amber-500 text-amber-400'
                                            : 'border-transparent text-gray-400 hover:text-white'
                                            } `}
                                    >
                                        <Icon size={18} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'posts' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-white">Artículos del Blog</h3>
                                    <button
                                        onClick={() => setShowAIModal(true)}
                                        className="flex items-center gap-2 bg-purple-500/20 text-purple-400 px-4 py-2 rounded-xl font-bold hover:bg-purple-500/30 transition-all"
                                    >
                                        <Wand2 size={18} />
                                        Generar con IA
                                    </button>
                                </div>

                                {articles.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText size={40} className="text-blue-400" />
                                        </div>
                                        <p className="text-white font-bold text-lg mb-2">No hay artículos publicados</p>
                                        <p className="text-gray-400 text-sm mb-4">Crea contenido manualmente o genera con IA</p>
                                        <div className="flex justify-center gap-3">
                                            <button
                                                onClick={() => setShowArticleModal(true)}
                                                className="bg-amber-500 text-black px-4 py-2 rounded-xl font-bold hover:bg-amber-400 transition-all"
                                            >
                                                Crear Artículo
                                            </button>
                                            <button
                                                onClick={() => setShowAIModal(true)}
                                                className="bg-purple-500/20 text-purple-400 px-4 py-2 rounded-xl font-bold hover:bg-purple-500/30 transition-all flex items-center gap-2"
                                            >
                                                <Wand2 size={18} />
                                                Generar sobre Producto
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {articles.map(article => (
                                            <div key={article.id} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-amber-500/30 transition-all">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-white">{article.title}</h4>
                                                        <p className="text-gray-400 text-sm mt-1 line-clamp-2">{article.content}</p>
                                                        <p className="text-gray-500 text-xs mt-2">
                                                            {new Date(article.createdAt).toLocaleDateString('es-AR')}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-4">
                                                        <button
                                                            onClick={() => toggleArticleStatus(article.id)}
                                                            className={`px - 3 py - 1 rounded text - xs font - bold transition - all ${article.status === 'PUBLISHED'
                                                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                                                : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                                                                } `}
                                                        >
                                                            {article.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                                                        </button>
                                                        <button
                                                            onClick={() => deleteArticle(article.id)}
                                                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'recipes' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-white">Recetas de Tragos</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowAIRecipeModal(true)}
                                            className="flex items-center gap-2 bg-purple-500/20 text-purple-400 px-4 py-2 rounded-xl font-bold hover:bg-purple-500/30 transition-all"
                                        >
                                            <Wand2 size={18} />
                                            Generar con IA
                                        </button>
                                        <button
                                            onClick={() => setShowRecipeModal(true)}
                                            className="bg-orange-500 text-black px-4 py-2 rounded-xl font-bold hover:bg-orange-400 transition-all"
                                        >
                                            + Nueva Receta
                                        </button>
                                    </div>
                                </div>

                                {recipes.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <BookOpen size={40} className="text-orange-400" />
                                        </div>
                                        <p className="text-white font-bold text-lg mb-2">No hay recetas creadas</p>
                                        <p className="text-gray-400 text-sm">Agrega recetas de tragos y cócteles</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {recipes.map(recipe => (
                                            <div key={recipe.id} className="bg-white/5 rounded-xl p-4 border border-white/10 relative group">
                                                <button
                                                    onClick={() => deleteRecipe(recipe.id)}
                                                    className="absolute top-2 right-2 p-2 text-red-400 hover:bg-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <h4 className="font-bold text-white mb-2">{recipe.name}</h4>
                                                <p className="text-gray-400 text-sm mb-2">
                                                    {recipe.ingredients.length} ingredientes
                                                </p>
                                                <p className="text-gray-500 text-xs line-clamp-2">{recipe.instructions}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'newsletter' && (
                            <div>
                                <h3 className="text-lg font-bold text-white mb-6">Newsletter</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Mail className="text-blue-400" size={24} />
                                            <h4 className="font-bold text-white">Suscriptores</h4>
                                        </div>
                                        <p className="text-3xl font-bold text-blue-400">0</p>
                                        <p className="text-sm text-gray-400">activos</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Share2 className="text-purple-400" size={24} />
                                            <h4 className="font-bold text-white">Último Envío</h4>
                                        </div>
                                        <p className="text-lg text-gray-400">Nunca</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setMessage('✅ Newsletter generado')}
                                    className="bg-emerald-500 text-black px-6 py-2 rounded-xl font-bold hover:bg-emerald-400 transition-all"
                                >
                                    Generar Newsletter
                                </button>
                            </div>
                        )}

                        {activeTab === 'social' && (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Share2 size={40} className="text-pink-400" />
                                </div>
                                <p className="text-white font-bold text-lg mb-2">Posts para Redes Sociales</p>
                                <p className="text-gray-400 text-sm">La IA genera posts automáticamente desde tus artículos</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Article Modal */}
                {showArticleModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-neutral-900 rounded-2xl border border-white/10 w-full max-w-lg shadow-2xl">
                            <div className="flex justify-between items-center p-6 border-b border-white/10">
                                <h2 className="text-xl font-bold text-white">Crear Artículo</h2>
                                <button onClick={() => setShowArticleModal(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Título *</label>
                                    <input
                                        type="text"
                                        value={articleForm.title}
                                        onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                                        placeholder="Ej: Los mejores vinos para el verano"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Contenido</label>
                                    <textarea
                                        rows={6}
                                        value={articleForm.content}
                                        onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                                        placeholder="Escribe el contenido del artículo..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
                                    />
                                </div>
                            </div>
                            <div className="p-6 border-t border-white/10 flex gap-3">
                                <button onClick={() => setShowArticleModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl font-bold">
                                    Cancelar
                                </button>
                                <button onClick={handleCreateArticle} className="flex-1 bg-amber-500 hover:bg-amber-400 text-black px-4 py-3 rounded-xl font-bold">
                                    Crear Artículo
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recipe Modal */}
                {showRecipeModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-neutral-900 rounded-2xl border border-white/10 w-full max-w-lg shadow-2xl">
                            <div className="flex justify-between items-center p-6 border-b border-white/10">
                                <h2 className="text-xl font-bold text-white">Nueva Receta</h2>
                                <button onClick={() => setShowRecipeModal(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Nombre del Trago *</label>
                                    <input
                                        type="text"
                                        value={recipeForm.name}
                                        onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })}
                                        placeholder="Ej: Mojito Clásico"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Ingredientes (uno por línea)</label>
                                    <textarea
                                        rows={4}
                                        value={recipeForm.ingredients}
                                        onChange={(e) => setRecipeForm({ ...recipeForm, ingredients: e.target.value })}
                                        placeholder="50ml Ron blanco&#10;30ml Jugo de lima&#10;6 hojas de menta..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Preparación</label>
                                    <textarea
                                        rows={3}
                                        value={recipeForm.instructions}
                                        onChange={(e) => setRecipeForm({ ...recipeForm, instructions: e.target.value })}
                                        placeholder="Describe cómo preparar el trago..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
                                    />
                                </div>
                            </div>
                            <div className="p-6 border-t border-white/10 flex gap-3">
                                <button onClick={() => setShowRecipeModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl font-bold">
                                    Cancelar
                                </button>
                                <button onClick={handleCreateRecipe} className="flex-1 bg-orange-500 hover:bg-orange-400 text-black px-4 py-3 rounded-xl font-bold">
                                    Guardar Receta
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Generate Modal */}
                {showAIModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-neutral-900 rounded-2xl border border-white/10 w-full max-w-lg shadow-2xl">
                            <div className="flex justify-between items-center p-6 border-b border-white/10">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Wand2 className="text-purple-400" size={24} />
                                    Generar con IA
                                </h2>
                                <button onClick={() => setShowAIModal(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-gray-400 text-sm">
                                    Ingresa un tema y la IA generará un artículo para tu blog
                                </p>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Tema del Artículo</label>
                                    <input
                                        type="text"
                                        value={aiPrompt}
                                        onChange={(e) => setAIPrompt(e.target.value)}
                                        placeholder="Ej: Maridaje de vinos con asado, Mejores cócteles de verano..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {['Vinos de verano', 'Cócteles fáciles', 'Maridaje asado', 'Gin Tonics creativos'].map(suggestion => (
                                        <button
                                            key={suggestion}
                                            onClick={() => setAIPrompt(suggestion)}
                                            className="text-xs bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full hover:bg-purple-500/30"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-6 border-t border-white/10 flex gap-3">
                                <button onClick={() => setShowAIModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl font-bold">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAIGenerate}
                                    disabled={aiGenerating}
                                    className="flex-1 bg-purple-500 hover:bg-purple-400 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {aiGenerating ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Generando...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 size={18} />
                                            Generar Artículo
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Recipe Generate Modal */}
                {showAIRecipeModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-neutral-900 rounded-2xl border border-white/10 w-full max-w-lg shadow-2xl">
                            <div className="flex justify-between items-center p-6 border-b border-white/10">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Wand2 className="text-orange-400" size={24} />
                                    Generar Receta con IA
                                </h2>
                                <button onClick={() => setShowAIRecipeModal(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-gray-400 text-sm">
                                    Ingresa el nombre de un trago y la IA generará la receta completa con ingredientes, medidas y preparación
                                </p>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Nombre del Trago</label>
                                    <input
                                        type="text"
                                        value={aiRecipePrompt}
                                        onChange={(e) => setAIRecipePrompt(e.target.value)}
                                        placeholder="Ej: Mojito, Margarita, Negroni..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {['Mojito', 'Margarita', 'Negroni', 'Daiquiri', 'Aperol Spritz', 'Gin Tonic'].map(suggestion => (
                                        <button
                                            key={suggestion}
                                            onClick={() => setAIRecipePrompt(suggestion)}
                                            className="text-xs bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full hover:bg-orange-500/30"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-6 border-t border-white/10 flex gap-3">
                                <button onClick={() => setShowAIRecipeModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl font-bold">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAIRecipeGenerate}
                                    disabled={aiGenerating}
                                    className="flex-1 bg-orange-500 hover:bg-orange-400 text-black px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {aiGenerating ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Generando...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 size={18} />
                                            Generar Receta
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </DashboardLayout>
        </AuthGuard>
    );
}
