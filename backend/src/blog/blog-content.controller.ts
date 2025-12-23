import { Body, Controller, Post } from '@nestjs/common';

interface ArticleRequest {
    topic: string;
}

interface ArticleResponse {
    response: string;
}

@Controller('blog')
export class BlogContentController {

    /**
     * Generate blog article content (public endpoint)
     * Uses intelligent fallback content for beverages
     */
    @Post('generate')
    generateArticle(@Body() body: ArticleRequest): ArticleResponse {
        const topic = body.topic || '';
        const content = this.generateContent(topic);
        return { response: content };
    }

    private generateContent(topic: string): string {
        const lowerTopic = topic.toLowerCase();

        // Fernet and amaro
        if (lowerTopic.includes('fernet') || lowerTopic.includes('branca')) {
            return `# ${topic}: El Amargo Preferido de los Argentinos

## Historia del Fernet

El Fernet nació en Milán, Italia, en 1845, creado por Bernardino Branca. Este amaro italiano llegó a Argentina con la inmigración italiana y se convirtió en parte fundamental de nuestra cultura de bebidas.

## Características

- **Tipo:** Amaro (licor amargo)
- **Graduación:** 39-45% según la marca
- **Sabor:** Amargo intenso, mentolado, con notas herbales
- **Color:** Marrón oscuro, casi negro
- **Botánicos:** Más de 27 hierbas y especias (mirra, azafrán, manzanilla, cardamomo, aloe vera, entre otros)

## Cómo Tomarlo

### Fernet con Coca
El clásico argentino:
1. Vaso largo con mucho hielo
2. 30-50ml de Fernet
3. Completar con Coca-Cola (proporción 1:3)
4. Revolver suavemente

### Solo o con hielo
Para los que disfrutan su sabor intenso, servir bien frío en vaso corto.

### Digestivo
Tradicionalmente se toma después de las comidas como digestivo, a temperatura ambiente.

## Marcas Populares en Argentina

- **Fernet Branca:** El original italiano, el más vendido
- **Fernet 1882:** Versión argentina más suave
- **Fernet Vittone:** Opción económica
- **Branca Menta:** Versión mentolada

## Datos Curiosos

- Argentina consume más del 75% del Fernet Branca producido mundialmente
- Córdoba es la provincia donde más se consume
- El Fernet con Coca es tan argentino que Branca produce una versión especial para nuestro mercado

## Conservación

Guardar a temperatura ambiente, lejos de la luz solar. Una vez abierto, mantiene su calidad por años.

## En Trento Bebidas

Encontrá Fernet Branca y todas las variedades de amargos italianos. ¡Precios especiales para mayoristas!`;
        }

        // Aperitivos
        if (lowerTopic.includes('aperol') || lowerTopic.includes('campari') || lowerTopic.includes('cynar')) {
            return `# ${topic}: El Arte del Aperitivo Italiano

## Sobre ${topic}

${topic} es uno de los aperitivos italianos más reconocidos a nivel mundial. Su sabor único lo ha convertido en la base de cócteles icónicos.

## Características

- **Origen:** Italia
- **Tipo:** Aperitivo/Bitter
- **Color:** Distintivo tono naranja/rojo
- **Sabor:** Amargo equilibrado con notas cítricas y herbales

## Cócteles Clásicos

### Spritz
El aperitivo perfecto:
- 90ml Prosecco
- 60ml ${topic}
- Splash de soda
- Rodaja de naranja
- Hielo en copa de vino

### Negroni (con Campari)
- 30ml Gin
- 30ml Campari
- 30ml Vermut rojo
- Cáscara de naranja

## Momento Ideal

El aperitivo italiano se disfruta antes de las comidas principales, entre las 18:00 y 20:00 hs. Es un momento social para compartir con amigos.

## Disponible en Trento Bebidas

Descubrí nuestra selección completa de aperitivos italianos. ¡Consultanos por precios mayoristas!`;
        }

        // Whisky
        if (lowerTopic.includes('whisky') || lowerTopic.includes('whiskey') || lowerTopic.includes('jack daniel') || lowerTopic.includes('johnnie walker') || lowerTopic.includes('chivas')) {
            return `# ${topic}: Guía del Whisky

## Sobre ${topic}

${topic} es un destilado de prestigio mundial, apreciado por su complejidad aromática y sabor sofisticado.

## Tipos de Whisky

- **Escocés (Scotch):** Ahumado, malta
- **Irlandés:** Suave, triple destilación
- **Bourbon:** Dulce, maíz, roble americano
- **Canadiense:** Ligero, centeno

## Cómo Degustarlo

### Solo
- Servir a temperatura ambiente o con una piedra de whisky
- Agregar unas gotas de agua para abrir los aromas

### On the Rocks
- 2-3 cubos de hielo grande
- Deja reposar 30 segundos antes de beber

## Cócteles Clásicos

### Old Fashioned
- 60ml Whisky
- 1 cubo de azúcar
- 2-3 gotas de Angostura
- Twist de naranja

### Whisky Sour
- 60ml Whisky
- 30ml Jugo de limón
- 15ml Jarabe simple
- Clara de huevo (opcional)

## En Trento Bebidas

Explorá nuestra selección de whiskies premium. ¡Consultanos por precios para comercios!`;
        }

        // Vodka
        if (lowerTopic.includes('vodka') || lowerTopic.includes('smirnoff') || lowerTopic.includes('absolut') || lowerTopic.includes('grey goose')) {
            return `# ${topic}: El Destilado Versátil

## Sobre ${topic}

${topic} es conocido por su pureza y versatilidad en coctelería. Su perfil neutro lo hace la base perfecta para infinitos cócteles.

## Características

- **Origen:** Europa del Este
- **Base:** Granos o papa
- **Graduación:** 37.5-40%
- **Perfil:** Limpio, neutro, suave

## Cócteles Populares

### Moscow Mule
- 60ml Vodka
- 120ml Ginger beer
- 15ml Jugo de lima
- Servir en taza de cobre

### Cosmopolitan
- 45ml Vodka
- 15ml Triple sec
- 30ml Jugo de arándano
- 15ml Jugo de lima

### Bloody Mary
- 60ml Vodka
- 120ml Jugo de tomate
- Tabasco, Worcestershire
- Apio para decorar

## En Trento Bebidas

Tenemos las mejores marcas de vodka. ¡Consultanos!`;
        }

        // Gin
        if (lowerTopic.includes('gin') || lowerTopic.includes('tanqueray') || lowerTopic.includes('bombay') || lowerTopic.includes('hendricks')) {
            return `# ${topic}: El Renacimiento del Gin

## Sobre ${topic}

${topic} ha experimentado un renacimiento global. Sus botánicos únicos y versatilidad lo hacen el favorito de los bartenders.

## Botánicos Comunes

- **Enebro:** El ingrediente esencial
- **Cítricos:** Limón, naranja, pomelo
- **Especias:** Cardamomo, canela, pimienta
- **Hierbas:** Cilantro, angélica, regaliz

## Cócteles Clásicos

### Gin Tonic
- 50ml Gin
- 150ml Tónica premium
- Hielo hasta el borde
- Garnish según el gin

### Negroni
- 30ml Gin
- 30ml Campari
- 30ml Vermut rojo

### Martini
- 60ml Gin
- 15ml Vermut seco
- Aceituna o twist de limón

## En Trento Bebidas

Descubrí nuestra selección de gins artesanales y premium. ¡Precios especiales para gastronómicos!`;
        }

        // Vino
        if (lowerTopic.includes('vino') || lowerTopic.includes('malbec') || lowerTopic.includes('cabernet') || lowerTopic.includes('wine')) {
            return `# ${topic}: El Arte del Vino

## Sobre ${topic}

${topic} representa la riqueza vitivinícola de nuestro país. Los vinos argentinos son reconocidos mundialmente por su calidad.

## Varietales Argentinos

- **Malbec:** Cepa insignia, notas de frutas rojas y ciruela
- **Cabernet Sauvignon:** Estructura, taninos elegantes
- **Torrontés:** Aromático, floral, refrescante
- **Bonarda:** Frutado, ideal para todos los días

## Temperaturas de Servicio

- **Tintos:** 16-18°C
- **Blancos:** 8-10°C
- **Espumantes:** 6-8°C

## Maridaje

- **Carnes rojas:** Malbec, Cabernet
- **Pastas:** Bonarda, Sangiovese
- **Pescados:** Torrontés, Chardonnay
- **Postres:** Cosecha tardía

## En Trento Bebidas

Amplia selección de vinos argentinos e importados. ¡Consultanos por cajas!`;
        }

        // Cerveza
        if (lowerTopic.includes('cerveza') || lowerTopic.includes('beer') || lowerTopic.includes('ipa') || lowerTopic.includes('lager')) {
            return `# ${topic}: Guía de Cervezas

## Sobre ${topic}

${topic} es una de las bebidas más populares del mundo. Existe una cerveza para cada paladar y ocasión.

## Estilos Populares

- **Lager:** Ligera, refrescante, fácil de tomar
- **IPA:** Lupulada, amarga, aromática
- **Stout:** Oscura, tostada, cremosa
- **Wheat:** Turbia, refrescante, especiada

## Temperatura de Servicio

- **Lagers:** 3-5°C (muy fría)
- **IPA:** 6-8°C
- **Stout:** 10-12°C
- **Artesanales:** 8-10°C

## Maridaje

- **Lagers:** Picadas, pizza, mariscos
- **IPA:** Comida picante, hamburguesas
- **Stout:** Chocolate, carnes ahumadas

## En Trento Bebidas

Cervezas nacionales e importadas. ¡Precios por pack y mayorista!`;
        }

        // Default beverage article
        return `# ${topic}: Guía Completa

## Introducción

${topic} es una bebida con características únicas que ha ganado popularidad entre los conocedores. En esta guía te contamos todo lo que necesitás saber.

## Características Principales

Este producto se destaca por su perfil de sabor único, resultado de un proceso de elaboración cuidadoso y materias primas de calidad.

## Cómo Disfrutarlo

### Solo
Servir a la temperatura recomendada para apreciar todas sus notas aromáticas.

### En Cócteles
${topic} puede ser la base o complemento de diversos cócteles clásicos y de autor.

## Maridaje Sugerido

Combiná ${topic} con alimentos que complementen su perfil de sabor. Consultá con nuestros expertos para recomendaciones personalizadas.

## Conservación

Almacenar en lugar fresco y seco, alejado de la luz solar directa.

## En Trento Bebidas

Encontrá ${topic} y mucho más en nuestro catálogo. Precios especiales para comercios y gastronómicos.

¡Consultanos!`;
    }
}
