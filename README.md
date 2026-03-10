# Sistema Web de Gestión de Usuarios, Pagos y Membresías para el gimnasio MasterFit

## Descripción
Este proyecto consiste en el desarrollo de un sistema web para la gestión administrativa del gimnasio **MasterFit**, orientado al control de **usuarios, clientes, membresías, pagos y progresos físicos**.  
La aplicación fue creada con el propósito de optimizar procesos que anteriormente se realizaban de forma manual, como el registro de clientes, la verificación de pagos y el control de membresías activas.

El sistema permite centralizar la información, reducir errores administrativos, mejorar la rapidez en la atención y facilitar el acceso a los datos desde una interfaz web.

---

## Objetivo del proyecto
Desarrollar un sistema web que permita gestionar de manera eficiente los usuarios, pagos y membresías del gimnasio MasterFit, mejorando la organización, el control administrativo y la disponibilidad de la información.

---

## Problemática abordada
Antes de este sistema, la gestión del gimnasio se realizaba mediante cuadernos y archivos de Excel, lo que generaba inconvenientes como:

- Registro manual de información
- Errores en pagos y membresías
- Pérdida de tiempo en búsquedas y validaciones
- Falta de información centralizada y actualizada
- Dificultad para llevar control administrativo eficiente

---

## Características principales
- Inicio de sesión con autenticación segura
- Gestión de usuarios del sistema
- Registro y administración de clientes
- Control de membresías activas e inactivas
- Registro de pagos y transacciones
- Seguimiento de progresos físicos de los clientes
- Panel administrativo con acceso a la información centralizada
- Arquitectura organizada y escalable

---

## Arquitectura del sistema
El proyecto fue desarrollado bajo una arquitectura **cliente-servidor desacoplada**, donde:

- El **backend** funciona como una **API REST**
- El **frontend** consume los servicios mediante solicitudes HTTP
- La comunicación entre ambas capas se realiza en formato **JSON**

Además, el backend sigue el patrón **MVC (Modelo - Vista - Controlador)**, lo que permite separar responsabilidades y mejorar el mantenimiento del sistema.

---

## Tecnologías utilizadas

### Backend
- **Laravel**
- **Laravel Sanctum**
- **PHP**

### Frontend
- **HTML**
- **JavaScript**
- **Tailwind CSS**

### Base de datos
- **MySQL**

### Otros
- API REST
- JSON
- Arquitectura cliente-servidor
- Patrón MVC

---

## Seguridad
La seguridad del sistema se implementó mediante **Laravel Sanctum**, permitiendo la autenticación de usuarios y la protección de rutas según el acceso autorizado.

---

## Módulos principales
- **Usuarios**
- **Clientes**
- **Membresías**
- **Transacciones**
- **Progresos**

---

## Diseño de base de datos
La base de datos fue diseñada en **MySQL** bajo un modelo relacional.  
Las entidades principales del sistema son:

- `users`
- `clientes`
- `membresias`
- `transacciones`
- `progresos`

La tabla **clientes** funciona como entidad central del sistema, ya que se relaciona con membresías, transacciones y progresos.

---

## Beneficios del sistema
- Mejora la organización administrativa del gimnasio
- Reduce errores en registros manuales
- Agiliza la consulta de información
- Facilita el control de pagos y membresías
- Centraliza los datos en una sola plataforma
- Permite futuras ampliaciones del sistema

---

## Resultados obtenidos
Durante la validación del sistema se evidenciaron resultados positivos, entre ellos:

- Funcionamiento correcto de los módulos principales
- Mejora en la eficiencia del proceso administrativo
- Reducción del tiempo en tareas como búsqueda de clientes y registro de pagos
- Mayor facilidad de uso y acceso a la información

---

## Requisitos para ejecutar el proyecto

### Requisitos generales
- PHP 8.x o superior
- Composer
- Node.js y npm
- MySQL
- Servidor local como XAMPP, Laragon o similar

---

## Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/tu-repositorio.git
cd tu-repositorio
