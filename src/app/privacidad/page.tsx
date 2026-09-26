import type { Metadata } from 'next'
import { PaginaLegal } from '@/components/landing/PaginaLegal'
import { linkWhatsApp } from '@/components/landing/precios'

export const metadata: Metadata = {
  title: 'Política de privacidad · Stackr',
  description: 'Qué datos trata Stackr, para qué, dónde se guardan y cómo ejercer tus derechos.',
}

export default function PrivacidadPage() {
  return (
    <PaginaLegal titulo="Política de privacidad" actualizado="26 de septiembre de 2026">
      <p>
        Stackr es un sistema de gestión para locales de celulares y servicio técnico. Esta política explica qué datos
        tratamos, para qué, dónde se guardan y cómo podés ejercer tus derechos. Se rige por la Ley 25.326 de Protección
        de los Datos Personales de la República Argentina.
      </p>

      <h2>Quién es responsable</h2>
      <p>
        Stackr, a cargo de Juan Pedro Nielsen, con domicilio en Necochea, provincia de Buenos Aires, Argentina. Para
        cualquier consulta sobre tus datos podés escribirnos por <a href={linkWhatsApp('mensual')}>WhatsApp</a>.
      </p>

      <h2>Qué datos tratamos</h2>
      <ul>
        <li><strong>Datos de tu cuenta:</strong> tu nombre, tu email, el nombre de tu local y los usuarios que des de alta.</li>
        <li>
          <strong>Datos que cargás en el sistema:</strong> inventario, ventas, clientes, reparaciones, caja y demás
          información de tu negocio. Esos datos son tuyos: Stackr los guarda y procesa sólo para prestarte el servicio,
          por cuenta y orden de tu local.
        </li>
        <li><strong>Datos técnicos:</strong> registros de acceso y de errores necesarios para que el sistema funcione y sea seguro.</li>
        <li>
          <strong>En la página pública de Stackr:</strong> usamos el píxel de Meta (Facebook e Instagram) para medir
          nuestros anuncios, por ejemplo cuántas personas se registran después de verlos. No se usa dentro del sistema
          ni en los catálogos de los locales.
        </li>
      </ul>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Prestarte el servicio y mantener tu cuenta.</li>
        <li>Darte soporte cuando lo pedís.</li>
        <li>Gestionar pagos, pruebas gratuitas y vencimientos.</li>
        <li>Mejorar el sistema y medir el rendimiento de nuestros anuncios.</li>
      </ul>
      <p>No vendemos ni alquilamos datos personales, ni los usamos para publicidad de terceros.</p>

      <h2>Dónde se guardan</h2>
      <p>
        Los datos se alojan en proveedores de infraestructura en la nube: Supabase (base de datos) y Vercel (sitio web),
        cuyos servidores pueden estar fuera de Argentina. Cada negocio sólo puede ver su propia información: la
        separación entre locales está aplicada en la base de datos.
      </p>

      <h2>Catálogo público</h2>
      <p>
        Si activás el catálogo online, los equipos que elijas publicar (modelo, fotos, precio y estado) quedan visibles
        para cualquiera que tenga el link. Nunca se publican el IMEI, el costo ni tus notas internas.
      </p>

      <h2>Cuánto tiempo los conservamos</h2>
      <p>
        Mientras tu cuenta exista. Si dejás de pagar, la cuenta pasa a sólo lectura y tus datos se conservan para que
        puedas consultarlos y descargarlos. Si pedís la baja definitiva, los eliminamos.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Podés pedir acceso, rectificación, actualización o supresión de tus datos escribiéndonos por WhatsApp. Además,
        desde Ajustes podés descargar un respaldo completo de tu negocio cuando quieras. La Agencia de Acceso a la
        Información Pública, en su carácter de órgano de control de la Ley 25.326, tiene la atribución de atender las
        denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos
        personales.
      </p>

      <h2>Cambios en esta política</h2>
      <p>Si la modificamos, publicamos la nueva versión en esta página con su fecha de actualización.</p>
    </PaginaLegal>
  )
}
