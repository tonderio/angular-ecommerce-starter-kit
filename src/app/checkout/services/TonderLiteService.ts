import { Injectable } from '@angular/core';
import {
    ICustomerCardsResponse,
    IInlineLiteCheckoutOptions,
    IPaymentMethod,
    ISaveCardRequest,
    LiteInlineCheckout
} from 'tonder-web-sdk';
import {IConfigureCheckout} from "tonder-web-sdk/types/common";
import {ITransaction} from "tonder-web-sdk/types/transaction";
import {IProcessPaymentRequest, IStartCheckoutResponse} from "tonder-web-sdk/types/checkout";

@Injectable({
    providedIn: 'root'
})

// This is an example/recommendation for use; you can use it or adapt it to your project's needs.
// Add your own logic if necessary.

export class TonderLiteService {
    private liteCheckout: LiteInlineCheckout;

    constructor(private sdkParameters: IInlineLiteCheckoutOptions) {
        this.initializeInlineCheckout();
    }

    private initializeInlineCheckout(): void {
        this.liteCheckout = new LiteInlineCheckout({...this.sdkParameters});
    }

    configureCheckout(customerData: IConfigureCheckout): void {
        this.liteCheckout.configureCheckout({ ...customerData });
    }

    async injectCheckout(): Promise<void> {
        await this.liteCheckout.injectCheckout();
    }

    verify3dsTransaction(): Promise<ITransaction | void> {
        return this.liteCheckout.verify3dsTransaction();
    }

    removeCheckout(): void {
        // Puede limpiar datos que necesite de su logica
    }

    payment(
        checkoutData: IProcessPaymentRequest,
    ): Promise<IStartCheckoutResponse> {
        return this.liteCheckout.payment(checkoutData);
    }

    getCustomerPaymentMethods(): Promise<IPaymentMethod[]> {
        return this.liteCheckout.getCustomerPaymentMethods();
    }

    getCustomerCards(): Promise<ICustomerCardsResponse> {
        return this.liteCheckout.getCustomerCards();
    }

    saveCustomerCard(cardData: ISaveCardRequest): Promise<any> {
        return this.liteCheckout.saveCustomerCard(cardData);
    }

    removeCustomerCard(cardId: string): Promise<void> {
        return this.liteCheckout.removeCustomerCard(cardId);
    }
}
