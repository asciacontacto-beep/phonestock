"use client"
import s from '../landing.module.css'
import LogoLoop from '../reactbits/LogoLoop'
import ScrollReveal from '../reactbits/ScrollReveal'
import { useMenosMovimiento } from '../preferencias'

/* Nombres en texto y no logos: los logos son marcas registradas, y el
   nombre alcanza para que el dueño piense "esto es para mí". */
const MARCAS = ['Apple', 'Samsung', 'Motorola', 'Xiaomi', 'Google Pixel', 'Huawei', 'Honor', 'iPhone 18 Pro']

const FRASE = 'Chau cuaderno. Chau Excel. Chau «creo que Martín me debe algo».'

export function MarcasYFrase() {
  const quieto = useMenosMovimiento()

  return (
    <>
      <section className={s.marcas} aria-label="Marcas con las que trabaja">
        <p className={s.marcasTitulo}>Para locales que venden</p>
        <LogoLoop
          logos={MARCAS.map(m => ({ node: <span className={s.marcaItem}>{m}</span>, title: m }))}
          speed={quieto ? 0 : 50}
          direction="left"
          logoHeight={36}
          gap={64}
          fadeOut
          fadeOutColor="#fbfbfd"
          ariaLabel="Marcas de celulares"
        />
      </section>

      <section className={s.frase}>
        <div className={s.ancho}>
          {quieto
            ? <h2 className={`${s.h2} ${s.fraseTexto}`}>{FRASE}</h2>
            : (
              <ScrollReveal
                baseOpacity={0.12}
                enableBlur
                baseRotation={2}
                blurStrength={6}
                containerClassName={s.fraseContenedor}
                textClassName={s.fraseTexto}
              >
                {FRASE}
              </ScrollReveal>
            )}
        </div>
      </section>
    </>
  )
}
