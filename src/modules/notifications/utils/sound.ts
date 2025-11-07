export const playNotificationSound = () => {
  if (typeof window === "undefined") return;

  const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
  if (!AudioContext) return;

  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(880, context.currentTime);

    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
    oscillator.addEventListener("ended", () => {
      gainNode.disconnect();
      oscillator.disconnect();
      context.close().catch(() => undefined);
    });
  } catch (error) {
    console.warn("[notifications] No se pudo reproducir el sonido", error);
  }
};
