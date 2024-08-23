import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnInit,
    OnDestroy,
} from "@angular/core";
import { IPaymentMethod, ICustomerCardsResponse } from "tonder-web-sdk";
import { TonderLiteService } from "../../services/TonderLiteService";
import {
    GetActiveCustomerQuery,
    GetOrderForCheckoutQuery,
} from "../../../common/generated-types";
import { GET_ACTIVE_CUSTOMER } from "../../../common/graphql/documents.graphql";
import { GET_ORDER_FOR_CHECKOUT } from "../../providers/checkout-resolver.graphql";
import { take } from "rxjs/operators";
import { DataService } from "../../../core/providers/data/data.service";
import { StateService } from "../../../core/providers/state/state.service";

@Component({
    selector: "vsf-checkout-tonder-lite-payment-method",
    templateUrl: "./checkout-tonder-lite-payment-method.component.html",
    styleUrls: ["./checkout-tonder-lite-payment-method.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: TonderLiteService,
            // Inicialización del SDK de Tonder Lite
            // Nota: Reemplace estas credenciales con las suyas propias en desarrollo/producción
            useFactory: () =>
                new TonderLiteService({
                    apiKey: "11e3d3c3e95e0eaabbcae61ebad34ee5f93c3d27",
                    returnUrl:
                        "http://localhost:4200/checkout/payment?tabPayment=2",
                    mode: "development",
                }),
        },
    ],
})
export class CheckoutTonderLitePaymentMethodComponent
    implements OnInit, OnDestroy
{
    loading: boolean;
    loadingPayment: boolean;
    checkoutData: any;
    paymentMethods: IPaymentMethod[];
    customerCards: ICustomerCardsResponse | undefined;
    selectedPaymentMethod?: IPaymentMethod;
    selectedCard?: string;
    messages: { severity: string; detail: string }[] = [
        {
            severity: "warn",
            detail: "No use datos de cliente o tarjeta reales!",
        },
    ];
    constructor(
        private cdr: ChangeDetectorRef,
        private tonderService: TonderLiteService,
        private dataService: DataService,
        private stateService: StateService,
    ) {
        // Datos de ejemplo para el checkout. En un escenario real, estos datos
        // deberían provenir de su aplicación o servicio.
        this.checkoutData = {
            customer: {
                firstName: "Adrian",
                lastName: "Martinez",
                country: "Mexico",
                address: "Pinos 507, Col El Tecuan",
                city: "Durango",
                state: "Durango",
                postCode: "34105",
                email: "adrian@email.com",
                phone: "8161234567",
            },
            currency: "MXN",
            cart: {
                total: 399,
                items: [
                    {
                        description: "Black T-Shirt",
                        quantity: 1,
                        price_unit: 1,
                        discount: 0,
                        taxes: 0,
                        product_reference: 1,
                        name: "T-Shirt",
                        amount_total: 399,
                    },
                ],
            },
        };
        this.paymentMethods = [];
    }

    ngOnInit() {
        this.initCheckout();
    }

    ngOnDestroy() {
        // Limpieza del checkout al destruir el componente
        this.tonderService.removeCheckout();
    }

    async init() {
        await this.getOrderData();
        this.initCheckout();
    }

    // Esto solo es un ejemplo de obtener datos del usuario logueado y carrito especifico para este proyecto
    // Debe ajustar a su proyecto
    async getOrderData(): Promise<void> {
        const getActiveCustomer$ =
            this.dataService.query<GetActiveCustomerQuery>(
                GET_ACTIVE_CUSTOMER,
                {},
                "network-only",
            );
        const getOrderForCheckout$ =
            this.dataService.query<GetOrderForCheckoutQuery>(
                GET_ORDER_FOR_CHECKOUT,
                {},
                "network-only",
            );

        const [customerData, orderData] = await Promise.all([
            getActiveCustomer$.pipe(take(1)).toPromise(),
            getOrderForCheckout$.pipe(take(1)).toPromise(),
        ]);
        if (customerData.activeCustomer) {
            this.stateService.setState("signedIn", true);
            this.checkoutData = {
                ...this.checkoutData,
                customer: {
                    firstName: customerData.activeCustomer.firstName,
                    lastName: customerData.activeCustomer.lastName,
                    email: customerData.activeCustomer.emailAddress,
                },
            };
        }
        if (orderData.activeOrder) {
            this.checkoutData = {
                ...this.checkoutData,
                cart: {
                    total: orderData.activeOrder.totalWithTax,
                    items: orderData.activeOrder.lines.map((line) => ({
                        description: line.productVariant.name,
                        quantity: line.quantity,
                        price_unit: line.unitPriceWithTax,
                        discount: 0,
                        taxes: 0,
                        product_reference: line.productVariant.id,
                        name: line.productVariant.name,
                        amount_total: line.unitPriceWithTax,
                    })),
                },
                customer: {
                    ...this.checkoutData.customer,
                    country:
                        orderData?.activeOrder?.shippingAddress?.country || "",
                    address:
                        orderData?.activeOrder?.shippingAddress?.streetLine1 ||
                        "",
                    city: orderData?.activeOrder?.shippingAddress?.city || "",
                    state:
                        orderData?.activeOrder?.shippingAddress?.province || "",
                    postCode:
                        orderData?.activeOrder?.shippingAddress?.postalCode ||
                        "",
                    phone:
                        orderData?.activeOrder?.shippingAddress?.phoneNumber ||
                        "",
                },
            };
        }
    }

    async initCheckout() {
        this.loading = true;
        // Configuración inicial del checkout con los datos del cliente
        this.tonderService.configureCheckout({
            customer: this.checkoutData.customer,
        });
        await this.tonderService.injectCheckout();

        // Verificación de transacción 3DS
        this.tonderService.verify3dsTransaction().then((response: any) => {
            console.log("Verify 3ds response", response);
        });

        // Carga de métodos de pago y tarjetas guardadas
        await this.getPaymentMethods();
        await this.getSavedCars();

        this.loading = false;
        this.cdr.detectChanges();
    }

    // Método para procesar el pago
    // Puede ser llamado cuando el usuario hace clic en el botón de pago
    async pay() {
        if (!this.selectedCard && !this.selectedPaymentMethod) {
            return alert("Seleccione una opción");
        }
        try {
            this.loadingPayment = true;
            const response = await this.tonderService.payment({
                ...this.checkoutData,
                ...(this.selectedCard
                    ? {
                          card: this.selectedCard, // // Envío de tarjeta seleccionada, o también puede enviar los datos de tarjeta como en el ejemplo Pagar con 'LITE SDK - TARJETA'
                      }
                    : {
                          payment_method:
                              this.selectedPaymentMethod?.payment_method, // Envío de método de pago seleccionado
                      }),
            });
            console.log(response);
            alert("Pago realizado con éxito");
        } catch (error) {
            alert("Error al realizar el pago");
        } finally {
            this.loadingPayment = false;
        }
    }

    // Obtiene los métodos de pago disponibles
    // Útil para mostrar opciones de pago al usuario
    async getPaymentMethods() {
        this.paymentMethods =
            (await this.tonderService.getCustomerPaymentMethods()) || [];
    }

    // Obtiene las tarjetas guardadas del cliente
    // Permite mostrar y seleccionar tarjetas previamente guardadas
    async getSavedCars() {
        this.customerCards = await this.tonderService.getCustomerCards();
    }

    // Guarda una nueva tarjeta para el cliente
    // Útil para implementar la funcionalidad "guardar para futuras compras"
    async saveCard() {
        await this.tonderService.saveCustomerCard({
            card_number: "",
            cvv: "",
            cardholder_name: "",
            expiration_year: "",
            expiration_month: "",
        });
    }

    // Elimina una tarjeta guardada del cliente
    // Útil para permitir a los usuarios gestionar sus métodos de pago guardados
    async removeSavedCard() {
        await this.tonderService.removeCustomerCard("<ID DE LA TARJETA>");
    }

    // Funciones genericas, puede desarrollar su propia lógica
    deselectCard() {
        this.selectedCard = undefined;
    }

    deselectPaymentMethod() {
        this.selectedPaymentMethod = undefined;
    }
}
