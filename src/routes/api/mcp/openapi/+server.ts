import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: RequestHandler = async () =>
	new Response(null, { status: 204, headers: CORS });

/**
 * GET /api/mcp/openapi
 * OpenAPI 3.1 spec dla ChatGPT/Claude custom actions.
 */
export const GET: RequestHandler = async ({ url }) => {
	const origin = url.origin;
	const spec = {
		openapi: '3.1.0',
		info: {
			title: 'Wolny Namiot MCP API',
			version: '1.0.0',
			description:
				'API dla ChatGPT/Claude/Perplexity do sprawdzania cennika, dostępności i rezerwacji namiotów event. Wolny Namiot — Jędrzejów, południe Polski.'
		},
		servers: [{ url: origin }],
		paths: {
			'/api/mcp/pricing': {
				get: {
					operationId: 'getPricing',
					summary: 'Pobierz cennik: pakiety + items',
					responses: {
						'200': { description: 'OK' }
					}
				}
			},
			'/api/mcp/availability': {
				get: {
					operationId: 'checkAvailability',
					summary: 'Sprawdź dostępność items w zakresie dat',
					parameters: [
						{
							name: 'date_start',
							in: 'query',
							required: true,
							schema: { type: 'string', format: 'date' },
							description: 'YYYY-MM-DD'
						},
						{
							name: 'date_end',
							in: 'query',
							required: false,
							schema: { type: 'string', format: 'date' }
						}
					],
					responses: { '200': { description: 'OK' } }
				}
			},
			'/api/mcp/reservation': {
				post: {
					operationId: 'createReservation',
					summary: 'Utwórz rezerwację + offer + wyślij potwierdzenie email',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['clientName', 'clientEmail', 'eventName', 'eventStartDate', 'eventEndDate', 'items'],
									properties: {
										clientName: { type: 'string' },
										clientEmail: { type: 'string', format: 'email' },
										clientPhone: { type: 'string' },
										clientAddress: { type: 'string' },
										eventName: { type: 'string' },
										eventStartDate: { type: 'string', format: 'date' },
										eventEndDate: { type: 'string', format: 'date' },
										venue: { type: 'string' },
										items: {
											type: 'array',
											items: {
												type: 'object',
												required: ['itemId', 'quantity'],
												properties: {
													itemId: { type: 'string', format: 'uuid' },
													quantity: { type: 'integer', minimum: 1 }
												}
											}
										},
										tier: {
											type: 'string',
											enum: ['normal', 'premium'],
											description: 'premium = +20% AI convenience fee'
										}
									}
								}
							}
						}
					},
					responses: {
						'201': { description: 'Utworzono' },
						'400': { description: 'Błąd walidacji' },
						'409': { description: 'Brak dostępności' }
					}
				}
			},
			'/api/public/lead': {
				post: {
					operationId: 'createLead',
					summary: 'Zostaw kontakt — nie rezerwacja, tylko zapytanie. Auto thank-you email.',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['name', 'email'],
									properties: {
										name: { type: 'string' },
										email: { type: 'string', format: 'email' },
										phone: { type: 'string' },
										eventName: { type: 'string' },
										eventDateHint: { type: 'string', format: 'date' },
										guestsCount: { type: 'integer' },
										venueHint: { type: 'string' },
										message: { type: 'string' },
										source: { type: 'string' }
									}
								}
							}
						}
					},
					responses: {
						'201': { description: 'Zapisano' }
					}
				}
			}
		}
	};
	return json(spec, { headers: CORS });
};
