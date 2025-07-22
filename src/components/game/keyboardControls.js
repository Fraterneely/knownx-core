export function setupKeyboardControls(setShowOrbits, setShowLabels, setRealScale, orbitRefs) {
  const handleKeyPress = (e) => {
    if (e.key === 'o') {
      setShowOrbits(prev => !prev);
      Object.values(orbitRefs.current).forEach(orbit => {
        orbit.visible = !orbit.visible;
      });
    } else if (e.key === 'l') {
      setShowLabels(prev => !prev);
    } else if (e.key === 's') {
      setRealScale(prev => !prev);
    }
  };

  window.addEventListener('keydown', handleKeyPress);

  return () => {
    window.removeEventListener('keydown', handleKeyPress);
  };
}