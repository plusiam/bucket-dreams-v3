const CACHE_NAME = 'bucket-dreams-v1.5';
const CACHE_STATIC = 'bucket-dreams-static-v1.5';
const CACHE_DYNAMIC = 'bucket-dreams-dynamic-v1.5';

// 핵심 파일들 (항상 캐시)
const coreFiles = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.json'
];

// 아이콘 파일들 (선택적 캐시)
const iconFiles = [
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png',
    './icons/favicon-32x32.png',
    './icons/favicon-16x16.png',
    './icons/maskable-icon-512.png'
];

// 캐시 크기 제한
const MAX_CACHE_SIZE = 50; // 최대 50개 항목

// 캐시 크기 제한 함수
function limitCacheSize(cacheName, size) {
    return caches.open(cacheName).then(cache => {
        return cache.keys().then(keys => {
            if (keys.length > size) {
                // 오래된 항목부터 삭제
                return cache.delete(keys[0]).then(() => {
                    return limitCacheSize(cacheName, size);
                });
            }
        });
    });
}

// 설치 이벤트
self.addEventListener('install', event => {
    console.log('SW: Install event');
    event.waitUntil(
        Promise.all([
            // 핵심 파일 캐시 (필수)
            caches.open(CACHE_STATIC).then(cache => {
                console.log('SW: Caching core files');
                return cache.addAll(coreFiles);
            }),
            // 아이콘 파일 캐시 (선택적)
            caches.open(CACHE_STATIC).then(cache => {
                console.log('SW: Attempting to cache icon files');
                return Promise.allSettled(
                    iconFiles.map(file => 
                        fetch(file)
                            .then(response => {
                                if (response.ok) {
                                    return cache.put(file, response);
                                }
                            })
                            .catch(err => console.log(`SW: Icon ${file} not found, continuing...`))
                    )
                );
            })
        ])
        .then(() => {
            console.log('SW: Installation completed');
            return self.skipWaiting(); // 즉시 활성화
        })
        .catch(err => {
            console.error('SW: Installation failed:', err);
            // 핵심 파일이 캐시되지 않으면 설치 실패
            throw err;
        })
    );
});

// 활성화 이벤트
self.addEventListener('activate', event => {
    console.log('SW: Activate event');
    event.waitUntil(
        Promise.all([
            // 오래된 캐시 정리
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (!cacheName.includes('bucket-dreams-') || 
                            (cacheName !== CACHE_STATIC && cacheName !== CACHE_DYNAMIC)) {
                            console.log('SW: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // 캐시 크기 제한 적용
            limitCacheSize(CACHE_DYNAMIC, MAX_CACHE_SIZE)
        ])
        .then(() => {
            console.log('SW: Claiming clients');
            return self.clients.claim(); // 즉시 제어권 획득
        })
        .then(() => {
            // 클라이언트에게 캐시 업데이트 알림
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'CACHE_UPDATED',
                        message: 'Service Worker activated and cache updated'
                    });
                });
            });
        })
    );
});

// 캐시 전략 결정 함수
function getCacheStrategy(request) {
    const url = new URL(request.url);
    
    // 핵심 파일들은 Cache First 전략
    if (coreFiles.includes(url.pathname) || 
        iconFiles.includes(url.pathname) ||
        url.pathname === '/' || 
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.webp')) {
        return 'cache-first';
    }
    
    // API 요청은 Network First 전략
    if (url.pathname.includes('/api/')) {
        return 'network-first';
    }
    
    // 기본값은 Cache First
    return 'cache-first';
}

// Cache First 전략
function cacheFirst(request) {
    return caches.match(request).then(response => {
        if (response) {
            console.log('SW: Cache hit for:', request.url);
            return response;
        }
        
        console.log('SW: Cache miss, fetching:', request.url);
        return fetch(request).then(fetchResponse => {
            // 성공적인 응답만 캐시
            if (fetchResponse && fetchResponse.status === 200) {
                const responseClone = fetchResponse.clone();
                const cacheName = request.url.includes('/icons/') ? CACHE_STATIC : CACHE_DYNAMIC;
                
                caches.open(cacheName).then(cache => {
                    cache.put(request, responseClone);
                    // 동적 캐시 크기 제한
                    if (cacheName === CACHE_DYNAMIC) {
                        limitCacheSize(CACHE_DYNAMIC, MAX_CACHE_SIZE);
                    }
                });
            }
            return fetchResponse;
        });
    });
}

// Network First 전략
function networkFirst(request) {
    return fetch(request).then(response => {
        if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_DYNAMIC).then(cache => {
                cache.put(request, responseClone);
                limitCacheSize(CACHE_DYNAMIC, MAX_CACHE_SIZE);
            });
        }
        return response;
    }).catch(() => {
        // 네트워크 실패 시 캐시에서 찾기
        return caches.match(request);
    });
}

// 오프라인 폴백 생성
function createOfflineFallback(request) {
    const acceptHeader = request.headers.get('accept') || '';
    
    // HTML 요청 시 index.html 반환
    if (acceptHeader.includes('text/html')) {
        return caches.match('./index.html').then(response => {
            if (response) {
                return response;
            }
            // index.html도 없으면 기본 오프라인 페이지
            return new Response(`
                <!DOCTYPE html>
                <html lang="ko">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>오프라인 - 버킷리스트</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                               text-align: center; padding: 50px; background: #f5f5f5; }
                        .offline-message { background: white; padding: 40px; border-radius: 10px; 
                                         box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; 
                                         margin: 0 auto; }
                    </style>
                </head>
                <body>
                    <div class="offline-message">
                        <h1>🎯 버킷리스트</h1>
                        <h2>오프라인 모드</h2>
                        <p>인터넷 연결을 확인해주세요.<br>연결이 복구되면 자동으로 업데이트됩니다.</p>
                        <button onclick="window.location.reload()">다시 시도</button>
                    </div>
                </body>
                </html>
            `, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        });
    }
    
    // 이미지 요청 시 플레이스홀더 반환
    if (acceptHeader.includes('image/')) {
        return new Response(`
            <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                <rect width="200" height="200" fill="#f0f0f0"/>
                <text x="100" y="100" text-anchor="middle" dy="0.3em" font-family="sans-serif" font-size="14" fill="#999">
                    오프라인
                </text>
            </svg>
        `, {
            headers: { 'Content-Type': 'image/svg+xml' }
        });
    }
    
    // 기본 오프라인 응답
    return new Response(JSON.stringify({
        error: '오프라인 상태입니다',
        message: '인터넷 연결을 확인해주세요'
    }), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
}

// 페치 이벤트
self.addEventListener('fetch', event => {
    // GET 요청만 처리하고, 같은 origin만 처리
    if (event.request.method !== 'GET' || 
        !event.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    const strategy = getCacheStrategy(event.request);
    
    event.respondWith(
        (strategy === 'network-first' ? 
            networkFirst(event.request) : 
            cacheFirst(event.request)
        ).catch(err => {
            console.error('SW: Fetch strategy failed:', err);
            return createOfflineFallback(event.request);
        })
    );
});

// 백그라운드 동기화 (향후 확장 가능)
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        console.log('SW: Background sync event');
        // 향후 오프라인에서 작성된 데이터를 온라인 시 동기화
    }
});

// 푸시 알림 (향후 확장 가능)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        console.log('SW: Push notification received:', data);
        
        const options = {
            body: data.body,
            icon: './icons/icon-192.png',
            badge: './icons/icon-192.png',
            data: data.data || {}
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('./')
    );
});

// 메시지 이벤트 (앱과 통신 강화)
self.addEventListener('message', event => {
    const { data } = event;
    
    if (!data) return;
    
    switch (data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_CACHE_INFO':
            // 캐시 정보 반환
            Promise.all([
                caches.open(CACHE_STATIC).then(cache => cache.keys()),
                caches.open(CACHE_DYNAMIC).then(cache => cache.keys())
            ]).then(([staticKeys, dynamicKeys]) => {
                event.ports[0].postMessage({
                    type: 'CACHE_INFO',
                    static: staticKeys.length,
                    dynamic: dynamicKeys.length,
                    total: staticKeys.length + dynamicKeys.length
                });
            });
            break;
            
        case 'CLEAR_CACHE':
            // 캐시 정리
            Promise.all([
                caches.delete(CACHE_STATIC),
                caches.delete(CACHE_DYNAMIC)
            ]).then(() => {
                event.ports[0].postMessage({
                    type: 'CACHE_CLEARED',
                    success: true
                });
            });
            break;
            
        default:
            console.log('SW: Unknown message type:', data.type);
    }
});