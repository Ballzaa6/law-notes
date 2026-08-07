// เพิ่มเลขเวอร์ชันทุกครั้งที่แก้ไขไฟล์เนื้อหา เพื่อบังคับให้ผู้ใช้ได้แคชชุดใหม่
const CACHE_NAME = 'sarup-tuabot-v20';

const PRECACHE_URLS = [
  './',
  './index.html',
  './สรุปตัวบท_ขาอาญา_dashboard.html',
  './สรุปตัวบท_ขาแพ่ง_dashboard.html',
  './ประมวลกฎหมายอาญา_dashboard.html',
  './ประมวลกฎหมายแพ่งและพาณิชย์_dashboard.html',
  './ประมวลกฎหมายวิธีพิจารณาความแพ่ง_dashboard.html',
  './ประมวลกฎหมายวิธีพิจารณาความอาญา_dashboard.html',
  './ประมวลรัษฎากร_dashboard.html',
  './มรรยาททนายความ_dashboard.html',
  './รวมบทบรรณาธิการเนติบัณฑิต.html',
  './รวมกฎหมายทรัพย์สินทางปัญญา_dashboard.html',
  './รวมกฎหมายทรัพย์สินทางปัญญาและการค้าระหว่างประเทศ/รวมกฎหมายทรัพย์สินทางปัญญา_dashboard.html',
  './รวมกฎหมายทรัพย์สินทางปัญญาและการค้าระหว่างประเทศ/พรบ_การรับขนของทางทะเล_dashboard.html',
  './บทบรรณาธิการ_ขาอาญา_สมัย76_dashboard.html',
  './บทบรรณาธิการ_ขาอาญา_สมัย77_dashboard.html',
  './บทบรรณาธิการ_ขาแพ่ง_สมัย76_dashboard.html',
  './บทบรรณาธิการ_ขาแพ่ง_สมัย77_dashboard.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// cache-first: ตอบจากแคชก่อนเพื่อให้เปิดออฟไลน์ได้ทันที
// แล้วค่อยอัปเดตแคชเงียบๆ เบื้องหลังถ้ามีเน็ต (stale-while-revalidate)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
