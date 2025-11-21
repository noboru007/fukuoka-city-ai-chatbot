import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ▼▼▼ Service Worker 無条件・即時抹殺コード ▼▼▼
// 以前のコードより強力です。読み込み完了を待たずに実行します。
if ('serviceWorker' in navigator) {
  // 1. 登録されている全SWを緊急解除
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      console.log('Emergency unregister:', registration);
      registration.unregister();
    }
  });

  // 2. キャッシュも全て破棄
  if (window.caches) {
    caches.keys().then((names) => {
      for (const name of names) {
        console.log('Destroying cache:', name);
        caches.delete(name);
      }
    });
  }
}
// ▲▲▲ ここまで ▲▲▲

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);