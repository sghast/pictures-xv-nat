# PROYECTO: FOTOS-NAT-XV

Actúa como un desarrollador Full Stack senior especializado en Node.js, Express, JavaScript, Firebase y Cloudinary. Tu tarea es ayudarme a construir una aplicación web para compartir fotografías de un evento.

Quiero que desarrolles el proyecto directamente en el espacio de trabajo de VS Code, creando y modificando los archivos necesarios.

**IMPORTANTE:** Soy estudiante de Desarrollo de Software y estoy aprendiendo estas tecnologías. Necesito código claro, organizado, mantenible y con explicaciones. No utilices arquitecturas innecesariamente complejas ni patrones avanzados que dificulten mi aprendizaje.

No construyas todo de golpe. Trabaja por etapas, explica lo que vas a implementar y espera mi confirmación antes de pasar a la siguiente etapa.

---

# 1. DESCRIPCIÓN DEL PROYECTO

El proyecto se llama `fotos-nat-xv`.

Es una aplicación web para un evento al que asistirán aproximadamente entre 80 y 90 personas.

El objetivo es que los invitados puedan subir fotografías del evento desde sus teléfonos móviles y que todas las fotografías aparezcan automáticamente en una galería pública.

No queremos que los invitados tengan que registrarse ni iniciar sesión.

## Tipos de usuarios

### Invitados
- Pueden acceder a la página de inicio.
- Pueden seleccionar y subir fotografías.
- Pueden visualizar todas las fotografías de la galería.
- No necesitan crear una cuenta.
- No pueden eliminar fotografías.
- No pueden acceder al panel de administración.

### Administrador
- Es el propietario del proyecto.
- Puede iniciar sesión mediante correo electrónico y contraseña.
- Puede acceder a un panel de administración.
- Puede visualizar las fotografías.
- Puede eliminar fotografías.
- Es el único que puede administrar el contenido.

No debe existir registro público de administradores.

---

# 2. TECNOLOGÍAS

Utiliza las siguientes tecnologías:

## Frontend
- HTML5
- CSS3
- JavaScript Vanilla.

No utilizar React, Angular, Vue ni otros frameworks frontend.

## Backend
- Node.js.
- Express.js.
- API REST.
- Arquitectura MVC.

## Base de datos
- Firebase Firestore.

Se utilizará Firestore para almacenar los metadatos de las fotografías, no los archivos de imagen.

## Autenticación
- Firebase Authentication.
- Método de autenticación: correo electrónico y contraseña.
- Solo existirá una cuenta administradora creada manualmente desde Firebase Console.

## Almacenamiento de imágenes
- Cloudinary.
- Utilizar Cloudinary para almacenar las fotografías originales y generar versiones optimizadas para la galería.

## Dependencias iniciales
Ya se ha inicializado el proyecto con `npm init -y` y se han instalado:

- express
- dotenv
- firebase-admin
- cloudinary

Instala otras dependencias únicamente cuando sean necesarias, explicando para qué sirven.

---

# 3. ARQUITECTURA GENERAL

La aplicación tendrá tres interfaces principales:

1. `/` — Página de invitados para subir fotografías.
2. `/galeria` — Galería pública de fotografías.
3. `/admin` — Panel de administración.

El backend será una API REST desarrollada con Express.

La arquitectura debe separar responsabilidades mediante:

- `models`: acceso y operaciones sobre los datos.
- `controllers`: lógica de negocio y procesamiento de peticiones.
- `routes`: definición de endpoints.
- `middlewares`: validaciones y seguridad.
- `config`: configuración de Firebase y Cloudinary.

El backend será el intermediario entre el frontend, Firebase y Cloudinary.

## Flujo general de subida de fotografías

1. Un invitado entra a la página principal.
2. Selecciona una o varias fotografías desde su dispositivo.
3. El frontend envía las imágenes al backend mediante `multipart/form-data`.
4. El backend valida los archivos.
5. El backend envía las imágenes a Cloudinary.
6. Cloudinary almacena las fotografías.
7. El backend obtiene las URL y los identificadores públicos de Cloudinary.
8. El backend guarda los metadatos en Firestore.
9. El frontend recibe una respuesta indicando que la subida fue exitosa.
10. Las fotografías aparecen en la galería pública.

El backend debe controlar los errores. Si la subida a Cloudinary funciona pero falla el registro en Firestore, debe existir un mecanismo de compensación que intente eliminar de Cloudinary la imagen que quedó sin registrar.

## Flujo de visualización

1. Un visitante entra a `/galeria`.
2. El frontend solicita las fotografías al backend.
3. El backend consulta Firestore.
4. Devuelve los datos necesarios para mostrar las fotografías.
5. El frontend presenta las imágenes utilizando las URL optimizadas de Cloudinary.

Quiero que las fotografías nuevas aparezcan automáticamente en la galería sin que el usuario tenga que recargar manualmente la página.

Evalúa una implementación con Firestore en tiempo real o una alternativa eficiente. Mantén las reglas de seguridad y evita exponer credenciales administrativas.

## Flujo de eliminación

1. El administrador inicia sesión mediante Firebase Authentication.
2. El frontend obtiene el ID token de Firebase.
3. Envía una solicitud al backend incluyendo el token en el encabezado `Authorization: Bearer`.
4. Un middleware del backend verifica el token utilizando Firebase Admin SDK.
5. El backend comprueba que el usuario autenticado sea el administrador autorizado.
6. Si la autorización es válida, el backend elimina la fotografía de Cloudinary.
7. Después elimina su registro de Firestore.

Los invitados nunca deben tener acceso a este endpoint.

---

# 4. ESTRUCTURA DE CARPETAS

Utiliza como referencia esta estructura:

fotos-nat-xv/
│
├── config/
│   ├── firebase.js
│   └── cloudinary.js
│
├── controllers/
│   ├── fotografiaController.js
│   └── adminController.js
│
├── middlewares/
│   ├── verificarAdmin.js
│   ├── validarImagen.js
│   └── limitarSubidas.js
│
├── models/
│   └── fotografiaModel.js
│
├── routes/
│   ├── fotografiaRoutes.js
│   └── adminRoutes.js
│
├── public/
│   ├── index.html
│   ├── galeria.html
│   ├── admin.html
│   │
│   ├── css/
│   │   └── estilos.css
│   │
│   └── js/
│       ├── subida.js
│       ├── galeria.js
│       └── admin.js
│
├── app.js
├── server.js
├── .env
├── .gitignore
└── package.json

Puedes modificar o ampliar la estructura si existe una razón técnica justificada, pero explícame los cambios.

---

# 5. CONFIGURACIÓN DE FIREBASE

El proyecto de Firebase ya está creado.

Nombre del proyecto: `fotos-nat-xv`.

Ya se creó:
- Una base de datos Firestore.
- Una aplicación web de Firebase.

La base de datos utiliza Firestore en modo producción.

Debemos utilizar Firebase Admin SDK exclusivamente en el backend.

El archivo `config/firebase.js` debe inicializar Firebase Admin SDK de manera segura.

Las credenciales del servicio deben obtenerse mediante variables de entorno o credenciales seguras del entorno de ejecución.

Nunca incluir archivos de cuentas de servicio ni claves privadas en el frontend o en el repositorio.

## Colección de Firestore

Crear una colección llamada:

`fotografias`

Cada documento debe contener, como mínimo:

- `nombreOriginal`: nombre original del archivo.
- `urlOriginal`: URL de la imagen original.
- `urlMiniatura`: URL optimizada para la galería.
- `publicId`: identificador de la imagen en Cloudinary.
- `fechaSubida`: fecha de subida.
- `formato`: formato de la imagen.
- `tamano`: tamaño del archivo en bytes.

Puedes proponer campos adicionales si son útiles.

No guardar los archivos de imagen directamente en Firestore.

---

# 6. CONFIGURACIÓN DE CLOUDINARY

Ya se creó una cuenta gratuita de Cloudinary.

Se utilizará Cloudinary para almacenar las fotografías.

El backend debe conectarse mediante las siguientes variables de entorno:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

El archivo `config/cloudinary.js` debe inicializar la conexión.

Nunca exponer `CLOUDINARY_API_SECRET` en el frontend.

No utilizar cargas directas sin firmar desde el navegador. Todas las cargas deben pasar por el backend.

Utilizar la API de Cloudinary para:
- Subir imágenes.
- Obtener su identificador público.
- Generar URL optimizadas.
- Eliminar imágenes.

Usar una carpeta de Cloudinary llamada `fotos-nat-xv` para organizar los archivos.

---

# 7. VALIDACIÓN Y SEGURIDAD

Esta parte es muy importante.

La aplicación será pública y estará disponible para decenas de invitados.

Implementar:

- Validación del tipo real de archivo, no confiar únicamente en la extensión o el MIME enviado por el navegador.
- Permitir formatos habituales: JPEG, PNG y WebP.
- Establecer un tamaño máximo razonable por fotografía, inicialmente 10 MB.
- Limitar la cantidad de fotografías por solicitud.
- Evitar archivos que no sean imágenes.
- Implementar límites de solicitudes para evitar abuso.
- Evitar nombres de archivo inseguros.
- Manejar errores de forma controlada.
- No mostrar claves ni credenciales en respuestas HTTP.
- Proteger los endpoints administrativos mediante Firebase Authentication y autorización del administrador.
- Utilizar Helmet y otras medidas razonables de seguridad.
- Configurar CORS correctamente si frontend y backend se alojan en dominios diferentes.
- No permitir que un invitado elimine fotografías.
- No permitir que un invitado modifique los metadatos de las fotografías.

La API pública debe limitarse a las operaciones necesarias para subir y visualizar fotografías.

No crear endpoints públicos para actualizar o eliminar fotografías.

---

# 8. DISEÑO DE LAS INTERFACES

Quiero una interfaz moderna, elegante y adaptable a dispositivos móviles.

El evento es una celebración de XV años, por lo que el diseño debe sentirse especial, visualmente atractivo y cuidado.

Evitar diseños excesivamente recargados.

## Página principal `/`

Debe incluir:

- Nombre o título del evento.
- Una breve bienvenida.
- Un mensaje invitando a compartir fotografías.
- Un botón para seleccionar imágenes.
- Vista previa de las imágenes seleccionadas.
- Opción para eliminar imágenes de la selección antes de subirlas.
- Botón para subir fotografías.
- Indicador de progreso.
- Mensajes de éxito y error.

Debe ser fácil de utilizar desde un teléfono móvil.

## Galería `/galeria`

Debe incluir:

- Un encabezado atractivo.
- Fotografías organizadas en una cuadrícula adaptable.
- Miniaturas optimizadas para mejorar la velocidad de carga.
- Posibilidad de abrir una fotografía en mayor tamaño.
- Diseño responsive.
- Carga eficiente de imágenes.

Las fotografías deben aparecer automáticamente cuando se suban.

## Panel de administración `/admin`

Debe incluir:

- Formulario de inicio de sesión.
- Correo electrónico y contraseña.
- Panel privado después de iniciar sesión.
- Visualización de las fotografías.
- Botón para eliminar fotografías.
- Confirmación antes de eliminar.
- Opción para cerrar sesión.

No implementar registro de usuarios.

---

# 9. RENDIMIENTO Y CONSIDERACIONES

Se estima:

- Entre 80 y 90 invitados.
- Aproximadamente 60 a 70 personas podrían subir fotografías.
- Cada persona podría subir hasta 10 fotografías.
- El escenario máximo estimado es de unas 700 fotografías.

Considerar este volumen al diseñar la aplicación.

Implementar:
- Miniaturas optimizadas.
- Carga diferida (`loading="lazy"`).
- Paginación o carga progresiva.
- Compresión y optimización razonable.
- Evitar descargar las imágenes originales para mostrar la galería.
- Evitar consultas innecesarias a Firestore.

No asumir que el plan gratuito soportará cualquier volumen sin límites. Tener en cuenta las cuotas y los créditos de Cloudinary y los límites de Firebase.

---

# 10. VARIABLES DE ENTORNO

Crear un `.env.example` con los nombres de las variables necesarias, pero sin valores reales.

El `.env` debe permanecer fuera del repositorio.

Incluir en `.gitignore`:

- `.env`
- archivos de credenciales de Firebase.
- `node_modules/`
- archivos temporales.

Nunca escribir credenciales reales directamente en el código.

---

# 11. FORMA DE TRABAJO

Quiero que trabajes por etapas.

No intentes desarrollar toda la aplicación de una sola vez.

Sigue este orden:

### Etapa 1: Preparación del proyecto
- Revisar el proyecto existente.
- Revisar `package.json`.
- Crear la estructura de carpetas.
- Crear `app.js` y `server.js`.
- Configurar Express.
- Servir los archivos estáticos desde `public`.
- Comprobar que el servidor funciona.

### Etapa 2: Conexión con servicios externos
- Configurar variables de entorno.
- Conectar Firebase Admin SDK.
- Conectar Cloudinary.
- Crear pruebas de conexión.
- Verificar que ambos servicios funcionan.

### Etapa 3: Backend y API
- Crear el modelo de fotografías.
- Crear controladores.
- Crear rutas.
- Implementar subida de fotografías.
- Implementar consulta de fotografías.
- Implementar eliminación administrativa.
- Implementar validaciones y seguridad.

### Etapa 4: Frontend
- Crear la página de invitados.
- Implementar selección y vista previa.
- Implementar subida.
- Crear la galería.
- Implementar actualización automática.
- Crear el panel administrativo.

### Etapa 5: Autenticación
- Integrar Firebase Authentication en el frontend.
- Verificar tokens en el backend.
- Autorizar únicamente al administrador.
- Probar que los invitados no puedan acceder a funciones administrativas.

### Etapa 6: Pruebas
- Probar subida de imágenes.
- Probar formatos no permitidos.
- Probar archivos demasiado grandes.
- Probar galería.
- Probar eliminación.
- Probar accesos no autorizados.
- Probar errores de conexión.

### Etapa 7: Despliegue
- Preparar frontend y backend para producción.
- Elegir un alojamiento compatible con Node.js.
- Configurar variables de entorno en producción.
- Verificar conexiones con Firebase y Cloudinary.
- Comprobar que la aplicación funciona desde dispositivos móviles.

---

# 12. INSTRUCCIONES IMPORTANTES PARA COPILOT

1. Antes de modificar archivos, revisa el contenido y la estructura actual del proyecto.
2. No sobrescribas configuraciones existentes sin explicar por qué.
3. No inventes credenciales ni valores de Firebase o Cloudinary.
4. Si necesitas una variable de entorno que todavía no he proporcionado, deja el nombre preparado y explícame dónde obtenerla.
5. Nunca solicites que publique mis claves privadas en el código.
6. No generes código innecesariamente complejo.
7. Utiliza JavaScript con módulos ES (`import` y `export`).
8. Mantén nombres de variables y funciones descriptivos.
9. Utiliza `async/await` para operaciones asíncronas.
10. Maneja los errores correctamente.
11. Comenta las partes importantes del código.
12. Explica qué hace cada archivo y cómo se relaciona con los demás.
13. No avances a la siguiente etapa hasta que yo confirme que la actual funciona.
14. Si encuentras un problema de seguridad, adviértelo antes de continuar.
15. Si una decisión técnica tiene varias alternativas, explícame brevemente sus ventajas y desventajas antes de elegir.

**COMIENZA CON LA ETAPA 1.**

Primero revisa mi proyecto actual y dime qué archivos y carpetas existen. Después implementa únicamente la preparación inicial del proyecto y la configuración de Express. No conectes todavía Firebase ni Cloudinary. 