import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
} from "@angular/core";
import { TonderInlineService } from "../../services/TonderInlineService";
import { ITransaction } from "tonder-web-sdk/types/transaction";
import { StateService } from "../../../core/providers/state/state.service";
import { DataService } from "../../../core/providers/data/data.service";
import {
    AddPaymentMutation, AddPaymentMutationVariables,
    GetActiveCustomerQuery,
    GetOrderForCheckoutQuery
} from "../../../common/generated-types";
import {GET_ACTIVE_CUSTOMER} from "../../../common/graphql/documents.graphql";
import { take} from 'rxjs/operators';
import {IProcessPaymentRequest} from "tonder-web-sdk";
import {GET_ORDER_FOR_CHECKOUT} from "../../providers/checkout-resolver.graphql";
import {ActivatedRoute, Router} from "@angular/router";
import {ADD_PAYMENT} from "../checkout-payment/checkout-payment.graphql";

@Component({
    selector: "vsf-checkout-tonder-inline",
    templateUrl: "./checkout-tonder-inline.component.html",
    // styleUrls: ['./checkout-tonder-inline.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: TonderInlineService,
            // Inicialización del SDK de Tonder Inline
            // Nota: Reemplace estas credenciales con las suyas propias en desarrollo/producción
            useFactory: () =>
                new TonderInlineService({
                    apiKey: "11e3d3c3e95e0eaabbcae61ebad34ee5f93c3d27",
                    returnUrl:
                        "http://localhost:4200/checkout/payment?tabPayment=0",
                    mode: "stage",
                }),
        },
    ],
})
export class CheckoutTonderInlineComponent implements OnInit, OnDestroy {
    // Not necessary.
    messages: { severity: string; detail: string }[] = [
        { severity: "warn", detail: "No use datos de tarjeta reales!" },
    ];
    loadingPayment: boolean;
    checkoutData: IProcessPaymentRequest;

    constructor(
        private tonderService: TonderInlineService,
        private dataService: DataService,
        private stateService: StateService,
        private router: Router,
        private route: ActivatedRoute
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
    }

    ngOnInit() {
        this.init();
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
        const getActiveCustomer$ = this.dataService.query<GetActiveCustomerQuery>(GET_ACTIVE_CUSTOMER, {}, 'network-only');
        const getOrderForCheckout$ = this.dataService.query<GetOrderForCheckoutQuery>(GET_ORDER_FOR_CHECKOUT, {}, 'network-only');

        const [customerData, orderData] = await Promise.all([
            getActiveCustomer$.pipe(take(1)).toPromise(),
            getOrderForCheckout$.pipe(take(1)).toPromise(),
        ]);
        if (customerData.activeCustomer) {
            this.stateService.setState('signedIn', true);
            this.checkoutData = {
                ...this.checkoutData,
                customer: {
                    firstName: customerData.activeCustomer.firstName,
                    lastName: customerData.activeCustomer.lastName,
                    email: customerData.activeCustomer.emailAddress,

                }
            };
        }
        if (orderData.activeOrder) {
            this.checkoutData = {
                ...this.checkoutData,
                cart: {
                    total: orderData.activeOrder.totalWithTax / 100,
                    items: orderData.activeOrder.lines.map(line => ({
                        description: line.productVariant.name,
                        quantity: line.quantity,
                        price_unit: line.unitPriceWithTax / 100,
                        discount: 0,
                        taxes: 0,
                        product_reference: line.productVariant.id,
                        name: line.productVariant.name,
                        amount_total: line.unitPriceWithTax / 100,
                    }))
                },
                customer: {
                    ...this.checkoutData.customer,
                    country: orderData?.activeOrder?.shippingAddress?.country || "",
                    address: orderData?.activeOrder?.shippingAddress?.streetLine1 || "",
                    city: orderData?.activeOrder?.shippingAddress?.city || "",
                    state: orderData?.activeOrder?.shippingAddress?.province || "",
                    postCode: orderData?.activeOrder?.shippingAddress?.postalCode || "",
                    phone: orderData?.activeOrder?.shippingAddress?.phoneNumber || "",
                }
            };
        }
    }

    async initCheckout() {
        // Configuración inicial del checkout con los datos del cliente
        this.tonderService.configureCheckout({
            customer: this.checkoutData.customer,
            secureToken: ""
        });
        // Inyección en el DOM
        await this.tonderService.injectCheckout();

        // Verificación de transacción 3DS
        this.tonderService
            .verify3dsTransaction()
            .then((response: ITransaction | void) => {
                console.log("Verify 3ds response", response);
                if(response && 'transaction_status' in response && response.transaction_status === 'Success'){
                    this.completeOrder();
                }
            });
    }

    // Método para procesar el pago
    // Puede ser llamado cuando el usuario hace clic en el botón de pago
    async pay() {
        try {
            this.loadingPayment = true;
            const response = await this.tonderService.payment(
                this.checkoutData,
            );
            console.log(response);
            await this.completeOrder();
            alert("Pago realizado con éxito");
        } catch (error) {
            console.log("ERROR", error);
            alert("Error al realizar el pago");
        } finally {
            this.loadingPayment = false;
        }
    }

    async completeOrder(){
        // Completar la orden
        // Limpiar carrito
        this.dataService.mutate<AddPaymentMutation, AddPaymentMutationVariables>(ADD_PAYMENT, {
            input: {
                method: 'standard-payment',
                metadata: {},
            },
        })
            .subscribe(async ({ addPaymentToOrder }) => {
                switch (addPaymentToOrder?.__typename) {
                    case 'Order':
                        const order = addPaymentToOrder;
                        if (order && (order.state === 'PaymentSettled' || order.state === 'PaymentAuthorized')) {
                            await new Promise<void>(resolve => setTimeout(() => {
                                this.stateService.setState('activeOrderId', null);
                                resolve();
                            }, 500));
                            this.router.navigate(['../confirmation', order.code], { relativeTo: this.route }).then(() => {
                                window.location.reload();
                            });
                        }
                        break;
                    case 'OrderPaymentStateError':
                    case 'PaymentDeclinedError':
                    case 'PaymentFailedError':
                    case 'OrderStateTransitionError':
                        // this.paymentErrorMessage = addPaymentToOrder.message;
                        break;
                }

            });

    }
}
