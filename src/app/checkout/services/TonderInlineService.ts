import { Injectable } from '@angular/core';
import { IInlineCheckoutOptions, InlineCheckout } from 'tonder-web-sdk';
import {IProcessPaymentRequest, IStartCheckoutResponse, IConfigureCheckout, ITransaction} from "tonder-web-sdk/types";


@Injectable({
    providedIn: "root",
})

// This is an example/recommendation for use; you can use it or adapt it to your project's needs.
// Add your own logic if necessary.

export class TonderInlineService {
    private inlineCheckout: InlineCheckout;

    constructor(private sdkParameters: IInlineCheckoutOptions) {
        this.initializeInlineCheckout();
    }

    private initializeInlineCheckout(): void {
        this.inlineCheckout = new InlineCheckout({ ...this.sdkParameters });
    }

    configureCheckout(customerData: IConfigureCheckout): void {
        this.inlineCheckout.configureCheckout({ ...customerData });
    }

    async injectCheckout(): Promise<void> {
        await this.inlineCheckout.injectCheckout();
    }

    verify3dsTransaction(): Promise<ITransaction | void> {
        return this.inlineCheckout.verify3dsTransaction();
    }

    removeCheckout(): void {
        this.inlineCheckout.removeCheckout();
    }

    payment(
        checkoutData: IProcessPaymentRequest,
    ): Promise<IStartCheckoutResponse> {
        return this.inlineCheckout.payment(checkoutData);
    }
}
