const VAPID_PUBLIC_KEY = "BNaiaCoGs2SrsgE6OIzx5k2I0kdxPjEH3zoggvpsQZh_XHG-p3DtqF44LUrRL7CCJ_3yJGLgzZ1MpfA_zCYIve4";

// Utility to convert Base64 URL to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert("Las notificaciones push no están soportadas en este navegador.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert("Permiso de notificaciones denegado.");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    const cities = prompt("¿De qué ciudad quieres recibir alertas urgentes?\nEjemplo: 'Bogotá', 'Medellín', o escribe 'Todas'", "Todas");
    if (!cities) return;

    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        cities
      })
    });

    if (response.ok) {
      alert("¡Suscrito correctamente a alertas urgentes de: " + cities + "!");
      const btn = document.getElementById('btnPushAlerts');
      if (btn) btn.style.display = 'none';
    } else {
      alert("Hubo un error guardando la suscripción.");
    }
  } catch (error) {
    console.error("Error subscribing to push:", error);
    alert("Error suscribiendo a notificaciones: " + error.message);
  }
}

async function checkPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    const btn = document.getElementById('btnPushAlerts');
    if (btn) {
      // Mostrar el botón solo si NO hay suscripción activa y los permisos NO están denegados definitivamente
      if (!subscription && Notification.permission !== 'denied') {
        btn.style.display = 'block';
      } else {
        btn.style.display = 'none';
      }
    }
  } catch (err) {
    console.error("Error comprobando suscripción", err);
  }
}

document.addEventListener('DOMContentLoaded', checkPushSubscription);
window.subscribeToPushNotifications = subscribeToPushNotifications;
