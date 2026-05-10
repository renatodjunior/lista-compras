const CACHE_NAME = "mylists-v24-barcode-lookup"

// Arquivos para cachear (funcionar offline)
const FILES = [
  "./index.html",
  "./manifest.json",
  "./icon-192.svg",
  "./icon-192.png",
  "https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js",
  "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js",
  "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap"
]

// Instalação: cacheia todos os arquivos. Não auto-skipWaiting — espera prompt do cliente.
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(FILES.map(f => cache.add(f)))
    })
  )
})

// Cliente pede pra ativar nova versão imediatamente
self.addEventListener("message", event => {
  if(event.data && event.data.action === "skipWaiting") self.skipWaiting()
})

// Ativação: remove caches antigos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Fetch: cache primeiro, rede como fallback
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Cacheia novas respostas dinamicamente
        if(response && response.status === 200){
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      }).catch(() => {
        // Offline e não tem cache: retorna o HTML principal
        if(event.request.destination === "document"){
          return caches.match("./index.html")
        }
      })
    })
  )
})
