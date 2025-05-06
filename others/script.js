function decodeVector(base) {
    const divisionFactor = 4;
    const hiddenExponent = 'I'.charCodeAt(0) - 'S'.charCodeAt(0);
    const offset = 2 * hiddenExponent;
  
    let interim = (base / divisionFactor) + (2 * 3) - offset;
  
    const hint = [12, 24, 36, 48];
    let sum = 0;
  
    for (let i = 0; i < hint.length; i++) {
      sum += hint[i] / (i + 1);
    }
  
    const sqrtComponent = Math.sqrt(144);
    const degrees = (interim * 1.5) + hiddenExponent;
  
    let total = sum + sqrtComponent;
    total -= 6;
    
    if (total < 50) {
        return 0;
    }

    const steps = total;
  
    return `VECTOR ACQUIRED : ${Math.round(degrees)}° — ${Math.round(steps)} PAS`;
  }
  
  const base = 512;
  
  console.log(decodeVector(base));
  