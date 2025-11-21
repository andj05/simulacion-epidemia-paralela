# Simulación Epidemiológica Monte-Carlo (SIR) Paralela - Caso República Dominicana 🇩🇴

![License](https://img.shields.io/badge/license-MIT-blue) ![Language](https://img.shields.io/badge/javascript-ES6%2B-yellow) ![Architecture](https://img.shields.io/badge/architecture-Node.js%20Worker%20Threads-green)

## 👤 Información del Estudiante

* **Nombre:** Anddy Josue Jara Ramirez
* **Matrícula:** 20240148
* **Materia:** Computación Paralela

## 📖 Descripción del Proyecto

Este proyecto implementa una simulación computacional estocástica basada en el modelo epidemiológico **SIR (Susceptible-Infectado-Recuperado)**. El objetivo es modelar la dinámica de propagación de una enfermedad infecciosa sobre una población de **1,000,000 de agentes** distribuidos en una grilla espacial 2D de $1000 \times 1000$.

El núcleo del proyecto es un estudio de **Benchmarking** (comparación de rendimiento) entre dos paradigmas:

1. **Implementación Secuencial:** Ejecución clásica en un solo hilo (Single-thread).
2. **Implementación Paralela:** Uso de Computación de Alto Rendimiento (HPC) mediante **Descomposición de Dominio** y `Worker Threads` en Node.js, implementando comunicación de fronteras con celdas fantasma (*Ghost Cells*).

## 📂 Estructura del Proyecto

```text
simulacion-epidemia-paralela/
├── README.md                       # Documentación técnica y guía de uso
├── informe.pdf                     # Informe técnico detallado (Análisis y Modelo)
├── package.json                    # Configuración de scripts y dependencias
├── data/                           # Salida de datos (CSVs generados)
│   ├── resultados_secuencial.csv   # Traza diaria (Baseline)
│   ├── resultados_paralelo.csv     # Traza diaria (Multihilo)
│   └── tiempos_scaling.csv         # Métricas de tiempos vs. Cores
└── src/
    ├── secuencial/
    │   ├── sir_model.js            # Lógica del Modelo SIR (Clase Base)
    │   └── main.js                 # Ejecutable Secuencial
    ├── paralelo/
    │   ├── sir_model_parallel.js   # Orquestador del Modelo Paralelo
    │   ├── main_parallel.js        # Ejecutable Paralelo
    │   ├── worker.js               # Worker: Procesa bloques y Ghost Cells
    │   ├── stats_worker.js         # Worker: Reducción (Reduce) de estadísticas
    │   └── scaling_test.js         # Suite de pruebas de escalabilidad
    └── utils/
        ├── dashboard_epidemias.html # Dashboard interactivo (Mapa RD + Animación)
        ├── generate_plots.html      # Generador de gráficas estadísticas
        └── dominican-republic.svg   # Recurso vectorial del mapa
```

## ⚙️ Modelo Matemático

El sistema utiliza un autómata celular probabilístico calibrado para un escenario endémico de larga duración (600 días), similar a la realidad del COVID-19 en RD:

* **Prob. Contagio (β):** 0.18 (Moderada, evita picos explosivos irreales).
* **Prob. Recuperación (γ):** 0.08 (Lenta, ~12 días de infección activa).
* **Prob. Mortalidad (δ):** 0.002 (0.2% letalidad diaria).

## 🚀 Instrucciones de Ejecución

Sigue estos pasos para reproducir los resultados y generar las visualizaciones.

### 1. Instalación de Dependencias

```bash
npm install
```

### 2. Ejecución de Simulaciones (Backend)

El proyecto incluye scripts automatizados (definidos en `package.json`) para correr los algoritmos:

#### A. Ejecutar Versión Secuencial (Línea Base)

Calcula la propagación usando un solo núcleo. Genera `data/resultados_secuencial.csv`.

```bash
npm run secuencial
```

#### B. Ejecutar Versión Paralela (Optimizado)

Detecta los núcleos de tu CPU y divide la grilla en bloques. Genera `data/resultados_paralelo.csv`.

```bash
npm run paralelo
```

#### C. Test de Escalabilidad (Strong Scaling)

Ejecuta el modelo con 1, 2, 4 y 8 hilos consecutivamente para medir la ganancia de velocidad (Speed-up). Genera `data/tiempos_scaling.csv`.

```bash
npm run scaling
```

### 3. Visualización de Resultados (Frontend)

Debido a que el mapa es un archivo SVG local, se recomienda usar un servidor local simple para evitar errores de CORS:

1. Navega a la carpeta `src/utils/`.
2. Abre el archivo `dashboard_epidemias.html` (Recomendado usar extensión **Live Server** en VS Code).
3. En el panel lateral del Dashboard:

   * Carga `resultados_secuencial.csv`
   * Carga `resultados_paralelo.csv`
   * Carga `tiempos_scaling.csv`
4. Presiona "Iniciar Simulación" para ver la animación sobre el mapa de República Dominicana.

Para ver gráficas estadísticas detalladas, abre `src/utils/generate_plots.html`.
