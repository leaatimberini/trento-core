import { Body, Controller, Post } from '@nestjs/common';

interface SuggestDimensionsRequest {
    productName: string;
    category?: string;
}

interface DimensionsSuggestion {
    weight: number;  // grams
    height: number;  // cm
    width: number;   // cm
    depth: number;   // cm
    confidence: string;
}

@Controller('products')
export class ProductDimensionsController {

    /**
     * AI-powered dimension suggestion for products (public endpoint)
     * Suggests weight and dimensions based on product name and category
     */
    @Post('suggest-dimensions')
    suggestDimensions(@Body() body: SuggestDimensionsRequest): DimensionsSuggestion {
        const name = (body.productName || '').toLowerCase();
        const category = (body.category || '').toLowerCase();

        // Default dimensions
        let dimensions: DimensionsSuggestion = {
            weight: 500,
            height: 25,
            width: 8,
            depth: 8,
            confidence: 'low'
        };

        // Wine bottle 750ml
        if (name.includes('vino') || name.includes('wine') || name.includes('malbec') || name.includes('cabernet')) {
            if (name.includes('750')) {
                dimensions = { weight: 1200, height: 32, width: 8, depth: 8, confidence: 'high' };
            } else if (name.includes('375')) {
                dimensions = { weight: 600, height: 25, width: 7, depth: 7, confidence: 'high' };
            } else if (name.includes('1.5') || name.includes('magnum')) {
                dimensions = { weight: 2400, height: 38, width: 10, depth: 10, confidence: 'high' };
            } else {
                dimensions = { weight: 1200, height: 32, width: 8, depth: 8, confidence: 'medium' };
            }
        }

        // Fernet
        else if (name.includes('fernet') || name.includes('branca')) {
            if (name.includes('1') && (name.includes('lt') || name.includes('litro'))) {
                dimensions = { weight: 1450, height: 28, width: 9, depth: 9, confidence: 'high' };
            } else if (name.includes('750')) {
                dimensions = { weight: 1100, height: 25, width: 8, depth: 8, confidence: 'high' };
            } else if (name.includes('450') || name.includes('500')) {
                dimensions = { weight: 750, height: 22, width: 7, depth: 7, confidence: 'high' };
            } else {
                dimensions = { weight: 1100, height: 25, width: 8, depth: 8, confidence: 'medium' };
            }
        }

        // Whisky
        else if (name.includes('whisky') || name.includes('whiskey') || name.includes('bourbon') ||
            name.includes('jack daniel') || name.includes('johnnie walker') || name.includes('chivas')) {
            if (name.includes('1') && (name.includes('lt') || name.includes('litro'))) {
                dimensions = { weight: 1500, height: 30, width: 10, depth: 10, confidence: 'high' };
            } else if (name.includes('750')) {
                dimensions = { weight: 1150, height: 27, width: 9, depth: 9, confidence: 'high' };
            } else {
                dimensions = { weight: 1150, height: 27, width: 9, depth: 9, confidence: 'medium' };
            }
        }

        // Vodka
        else if (name.includes('vodka') || name.includes('smirnoff') || name.includes('absolut') || name.includes('grey goose')) {
            if (name.includes('1') && (name.includes('lt') || name.includes('litro'))) {
                dimensions = { weight: 1400, height: 32, width: 9, depth: 9, confidence: 'high' };
            } else if (name.includes('750')) {
                dimensions = { weight: 1100, height: 28, width: 8, depth: 8, confidence: 'high' };
            } else {
                dimensions = { weight: 1100, height: 28, width: 8, depth: 8, confidence: 'medium' };
            }
        }

        // Gin
        else if (name.includes('gin') || name.includes('tanqueray') || name.includes('bombay') || name.includes('hendrick')) {
            if (name.includes('1') && (name.includes('lt') || name.includes('litro'))) {
                dimensions = { weight: 1450, height: 30, width: 9, depth: 9, confidence: 'high' };
            } else if (name.includes('750')) {
                dimensions = { weight: 1100, height: 27, width: 8, depth: 8, confidence: 'high' };
            } else {
                dimensions = { weight: 1100, height: 27, width: 8, depth: 8, confidence: 'medium' };
            }
        }

        // Aperol/Campari
        else if (name.includes('aperol') || name.includes('campari') || name.includes('cynar')) {
            if (name.includes('1') && (name.includes('lt') || name.includes('litro'))) {
                dimensions = { weight: 1400, height: 28, width: 9, depth: 9, confidence: 'high' };
            } else if (name.includes('750')) {
                dimensions = { weight: 1050, height: 25, width: 8, depth: 8, confidence: 'high' };
            } else {
                dimensions = { weight: 1050, height: 25, width: 8, depth: 8, confidence: 'medium' };
            }
        }

        // Cerveza (beer)
        else if (name.includes('cerveza') || name.includes('beer') ||
            category.includes('cerveza') || category.includes('beer')) {
            if (name.includes('1') && (name.includes('lt') || name.includes('litro'))) {
                dimensions = { weight: 1100, height: 30, width: 9, depth: 9, confidence: 'high' };
            } else if (name.includes('710') || name.includes('730')) {
                dimensions = { weight: 800, height: 25, width: 8, depth: 8, confidence: 'high' };
            } else if (name.includes('473') || name.includes('500')) {
                dimensions = { weight: 550, height: 18, width: 7, depth: 7, confidence: 'high' };
            } else if (name.includes('330') || name.includes('355')) {
                dimensions = { weight: 400, height: 17, width: 6, depth: 6, confidence: 'high' };
            } else {
                dimensions = { weight: 400, height: 17, width: 6, depth: 6, confidence: 'medium' };
            }
        }

        // Ron (Rum)
        else if (name.includes('ron') || name.includes('rum') || name.includes('bacardi') || name.includes('havana')) {
            if (name.includes('1') && (name.includes('lt') || name.includes('litro'))) {
                dimensions = { weight: 1450, height: 30, width: 9, depth: 9, confidence: 'high' };
            } else if (name.includes('750')) {
                dimensions = { weight: 1100, height: 27, width: 8, depth: 8, confidence: 'high' };
            } else {
                dimensions = { weight: 1100, height: 27, width: 8, depth: 8, confidence: 'medium' };
            }
        }

        // Tequila
        else if (name.includes('tequila') || name.includes('mezcal') || name.includes('jose cuervo')) {
            if (name.includes('1') && (name.includes('lt') || name.includes('litro'))) {
                dimensions = { weight: 1500, height: 28, width: 10, depth: 10, confidence: 'high' };
            } else if (name.includes('750')) {
                dimensions = { weight: 1150, height: 25, width: 8, depth: 8, confidence: 'high' };
            } else {
                dimensions = { weight: 1150, height: 25, width: 8, depth: 8, confidence: 'medium' };
            }
        }

        // Espumante/Champagne
        else if (name.includes('champagne') || name.includes('espumante') || name.includes('prosecco') || name.includes('cava')) {
            dimensions = { weight: 1500, height: 32, width: 10, depth: 10, confidence: 'high' };
        }

        // Licor
        else if (name.includes('licor') || name.includes('baileys') || name.includes('kahlua') || name.includes('amaretto')) {
            if (name.includes('1') && (name.includes('lt') || name.includes('litro'))) {
                dimensions = { weight: 1400, height: 26, width: 10, depth: 10, confidence: 'high' };
            } else if (name.includes('750')) {
                dimensions = { weight: 1050, height: 23, width: 9, depth: 9, confidence: 'high' };
            } else {
                dimensions = { weight: 1050, height: 23, width: 9, depth: 9, confidence: 'medium' };
            }
        }

        // Gaseosa/Soda (soft drinks)
        else if (name.includes('coca') || name.includes('pepsi') || name.includes('sprite') ||
            name.includes('fanta') || name.includes('gaseosa') || name.includes('soda')) {
            if (name.includes('2.25') || name.includes('2250')) {
                dimensions = { weight: 2350, height: 38, width: 11, depth: 11, confidence: 'high' };
            } else if (name.includes('1.5') || name.includes('1500')) {
                dimensions = { weight: 1600, height: 35, width: 9, depth: 9, confidence: 'high' };
            } else if (name.includes('500')) {
                dimensions = { weight: 550, height: 22, width: 7, depth: 7, confidence: 'high' };
            } else if (name.includes('354') || name.includes('330')) {
                dimensions = { weight: 390, height: 12, width: 7, depth: 7, confidence: 'high' };
            } else {
                dimensions = { weight: 1600, height: 35, width: 9, depth: 9, confidence: 'medium' };
            }
        }

        // Agua (water)
        else if (name.includes('agua') || name.includes('water') || name.includes('mineral')) {
            if (name.includes('2') && (name.includes('lt') || name.includes('litro'))) {
                dimensions = { weight: 2100, height: 32, width: 10, depth: 10, confidence: 'high' };
            } else if (name.includes('1.5') || name.includes('1500')) {
                dimensions = { weight: 1600, height: 32, width: 9, depth: 9, confidence: 'high' };
            } else if (name.includes('500')) {
                dimensions = { weight: 530, height: 22, width: 6, depth: 6, confidence: 'high' };
            } else {
                dimensions = { weight: 1600, height: 32, width: 9, depth: 9, confidence: 'medium' };
            }
        }

        return dimensions;
    }
}
