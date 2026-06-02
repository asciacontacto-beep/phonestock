const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/sell/SellClient.tsx', 'utf8');

// The original file has {step === 3 && ( for the old "Pago y Cierre" block
// And it has {step === 4 && ( for the "Datos del Cliente" block

// We want:
// 1. Accesorios -> step 2
// 2. Datos del Cliente -> step 3
// 3. Pago y Cierre -> step 4

// The Accessories block ends with: setStep(3) -> Continuar al Cliente
code = code.replace(
  `onClick={() => {
               // Update auto-calculated total price for Step 4
               if (sp === '') {
                 const accTotal = selectedAccessories.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
                 const phoneTotal = unit.isAccessoryOnly ? 0 : (unit.price || 0); // Assuming stock might have price? Actually user inputs it in step 4 usually.
                 // We just pre-fill the sp if it's accessories only, or leave it blank
               }
               setStep(3)
            }}>Continuar al Cliente</button>`,
  `onClick={() => {
               if (sp === '') {
                 const accTotal = selectedAccessories.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
               }
               setStep(3)
            }}>Continuar al Cliente</button>`
);

// We need to fix the conditions. Right now, Customer data is under {step === 4 && (
// And Pago y Cierre is under {step === 3 && (
// We need to swap them.

// First, change Pago y Cierre from 3 to 4:
code = code.replace(
  `{step === 3 && (
        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="lbl">4. Pago y Cierre</div>`,
  `{step === 4 && (
        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="lbl">4. Pago y Cierre</div>`
);

// Then change its back button from setStep(3) to setStep(3) (which is correct, go back to Customer Data which will be 3)
code = code.replace(
  `<button className="btn btn-ghost" onClick={() => setStep(3)}>Atrás</button>`,
  `<button className="btn btn-ghost" onClick={() => setStep(3)}>Atrás</button>`
); // Already ok

// Now change Customer Data from 4 to 3:
code = code.replace(
  `{step === 4 && (
        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="lbl">2. Datos del Cliente</div>`,
  `{step === 3 && (
        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="lbl">3. Datos del Cliente</div>`
);

// Change its Volver button to setStep(2) instead of setStep(2) (already ok)
// Change its Continuar button to setStep(4) instead of setStep(4) (already ok)

fs.writeFileSync('src/app/(app)/sell/SellClient.tsx', code);
console.log('Fixed steps logic successfully.');
