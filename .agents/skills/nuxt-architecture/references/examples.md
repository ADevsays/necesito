# Ejemplos de Código

Esta referencia contiene ejemplos concretos extraídos del proyecto CodeCollab para ilustrar los patrones de la arquitectura.

## 1. Componente de Módulo

**Ubicación:** `modules/articles/components/ArticleCardIndex.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
    title:string, 
    description: string, 
    timePublish: string,
    urlImg: string,
    slug:string
}>();
</script>

<template>
    <NuxtLink :to="`/noticias/${props.slug}`">
        <article class="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
            <div class="aspect-video bg-gray-100">
                <img :src="props.urlImg || 'https://placehold.co/600x400/EEEEEE/999999'" :alt="props.title"
                    class="w-full h-full object-cover" />
            </div>
            <div class="p-6">
                <div class="flex items-center space-x-2 mb-3">
                    <span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">Technology</span>
                    <span class="text-gray-500 text-sm">{{ props.timePublish }}</span>
                </div>
                <h3 class="text-xl font-bold mb-3">{{ props.title }}</h3>
                <p class="text-gray-600 mb-4">{{ props.description }}</p>
            </div>
        </article>
    </NuxtLink>
</template>
```

**Características:**
- TypeScript con `defineProps<{...}>()`
- TailwindCSS para estilos
- Navegación con NuxtLink
- Props bien tipadas

## 2. Composable de Módulo

**Ubicación:** `modules/articles/composables/useCheckCoins.ts`

```typescript
import { useToast } from 'vue-toastification';
import { prices, types } from '~/const/coins';
import winCoins from '~/modules/bank/server/winCoins';
import baseUrl from '~/server/baseUrl';
import { useLoginStore } from '~/modules/user/store/user';
import updateVisit from "../server/updateVisit";
import { useFetchWithAuth } from '~/composables/useFetch';
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';

export function useCheckCoins(props: { newId: string }) {
    const url = baseUrl(useRuntimeConfig());
    const { fetchWithAuth } = useFetchWithAuth();

    const observerRef = ref(null);
    const toast = useToast();
    const loginStore = useLoginStore();
    const initTimer = ref(false);

    let observer: null | IntersectionObserver;
    let timer: null | NodeJS.Timeout;

    const unobserve = () => {
        if (observer && observerRef.value) {
            observer.unobserve(observerRef.value);
            observer.disconnect();
        }
    };

    const updateArticleVisit = async () => {
        await updateVisit(url, props.newId, fetchWithAuth);
    };

    const sendCoin = async () => {
        const coinData = {
            type: types.NEW,
            quantity: prices.news,
            idUser: loginStore.user?.id as string,
            typeId: props.newId
        };
        const { result } = await winCoins(url, coinData, fetchWithAuth);
        if (result.status) {
            setTimeout(() => {
                toast.success("Felicidades! Por leer la noticia ganaste 10 CodeCoins.");
            }, 3000)
        }
    };

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
            sendCoin();
            unobserve();
            updateArticleVisit();
        };
    };

    onMounted(() => {
        timer = setTimeout(() => {
            initTimer.value = true;
        }, 11000);

        observer = new IntersectionObserver(handleIntersect, {
            root: null,
            rootMargin: "300px",
            threshold: 1
        });
    });

    watch(initTimer, () => {
        if (!initTimer.value) return;
        if (observerRef.value && observer) observer.observe(observerRef.value);
    })

    onBeforeUnmount(() => {
        unobserve();
    });

    return {
        observerRef
    };
}
```

**Características:**
- Export named function
- Usa constantes del proyecto
- Integra con stores
- Llamadas a server functions
- Lifecycle hooks
- Retorna estado para el componente

## 3. Composable Global

**Ubicación:** `composables/useFetch.ts`

```typescript
import { useLoginStore } from '~/modules/user/store/user';
import { refreshAccessToken } from '~/modules/user/server/refreshToken';
import { navigateTo } from '#app';

export const useFetchWithAuth = () => {
    const loginStore = useLoginStore();
    
    const navigateLogin = () => {
        loginStore.logout();
        navigateTo('/login');
        return null;
    }
    
    const retryRequestWithNewToken = async (url: string, options: RequestInit, newToken: string) => {
        const newOptions = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${newToken}`
            }
        };
        return await fetch(url, newOptions);
    };

    const handleTokenRefresh = async (url: string, options: RequestInit) => {
        try {
            const newToken = await refreshAccessToken();
            if (!newToken) {
                return navigateLogin();
            }
            
            return await retryRequestWithNewToken(url, options, newToken);
        } catch (error) {
            return navigateLogin();
        }
    };

    const extractErrorMessage = async (response: Response): Promise<string> => {
        try {
            const data = await response.json();
            return data.error || data.message || `Error ${response.status}`;
        } catch {
            return `Error ${response.status}: ${response.statusText}`;
        }
    };

    let errorMsg: null | string = null;

    const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
        if (loginStore.token) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${loginStore.token}`
            };
        }
        try {
            let response = await fetch(url, options);
            if (response.status === 401 && loginStore.refreshToken) {
                const newResponse = await handleTokenRefresh(url, options);
                if (newResponse) {
                    response = newResponse;
                } else {
                    throw new Error('No se pudo refrescar el token');
                }
            } else if (response.status === 401) {
                return navigateLogin();
            } else if (!response.ok) {
                errorMsg = await extractErrorMessage(response);
            }

            if (!response.ok) {
                throw new Error(errorMsg || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error en la petición:', {error, errorMsg});
            throw error;
        }
    };

    return {
        fetchWithAuth,
        extractErrorMessage
    };
};
```

**Características:**
- Manejo de autenticación
- Refresh token automático
- Error handling robusto
- Reutilizable en todo el proyecto

## 4. Util

**Ubicación:** `utils/insertYTVideo.ts`

```typescript
const isValidYouTubeID = (id:string) => /^[a-zA-Z0-9_-]{11}$/.test(id);

export default function insertYTVideo(split:string[], player:any, options:any){
    const videoId = split[1];
    const url = split[split.length - 1];
    if (!isValidYouTubeID(url)) return;

    if (player.value) {
        player.value?.destroy();
    };
    player.value = new YT.Player('player', {...options, videoId});
}
```

**Características:**
- Función pura
- Default export
- Helper interno (isValidYouTubeID)
- Validación de datos

## 5. Constante

**Ubicación:** `const/coins.ts`

```typescript
const prices = {
    classes: 100, 
    news: 10, 
    teams: 350, 
    winning_team: 1000,
    seminary: 500,
}

const types = {
    "VIDEO_CLASS": "clases",
    "NEW": "noticias",
    "TEAM": "equipos",
    "SEMINARY": "seminarios",
    "CHALLENGE": "retos",
    "CREATION": "creation",
};

export {prices, types};
```

**Características:**
- Objetos constantes
- Named exports
- Tipado implícito
- Reutilizable en módulos

## 6. Vista de Módulo

**Ubicación:** `modules/articles/views/View.vue`

```vue
<script lang="ts" setup>
import baseUrl from '~/server/baseUrl';
import HeroIndex from '../sections/HeroIndex.vue';
import LatestIndex from '../sections/LatestIndex.vue';
import TrendingIndex from '../sections/TrendingIndex.vue';
import { useFetchWithAuth } from '~/composables/useFetch';

const baseArticle = {
    title: "",
    description: "",
    urlImg: "",
    publishedAt: ""
} as New;

const emptyArticles = Array(3).fill(baseArticle);

const url = baseUrl(useRuntimeConfig());
const { fetchWithAuth } = useFetchWithAuth();

const { data, error } = await useAsyncData<{featured: New, latest: New[], mostRead: New[]}>(
    'indexArticles',
    () => fetchWithAuth(`${url}/api/news/get_index_articles`)
);

const loadData = computed(()=> ({
    featured: data.value?.featured || baseArticle,
    latest: data.value?.latest || emptyArticles,
    mostRead: data.value?.mostRead || emptyArticles
}));

if(error.value){
    console.error(error.value);
};
</script>

<template>
    <div class="min-h-screen bg-white">
        <HeroIndex :featured="loadData?.featured"/>
        <LatestIndex :last-articles="loadData.latest"/>
        <TrendingIndex :trending-articles="loadData.mostRead"/>
    </div>
</template>
```

**Características:**
- Imports de secciones del módulo
- Composables globales
- useAsyncData de Nuxt
- Computed properties
- TypeScript generics
- Manejo de errores
- Props a componentes de sección
