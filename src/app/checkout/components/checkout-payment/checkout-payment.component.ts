import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'vsf-checkout-payment',
    templateUrl: './checkout-payment.component.html',
    // styleUrls: ['./checkout-payment.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPaymentComponent implements OnInit {
    activeTab = 0;

    constructor(private route: ActivatedRoute, private router: Router) { }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            const tabPayment = params['tabPayment'];
            this.activeTab = tabPayment ? parseInt(tabPayment, 10) : 0;
        });
    }


    isActive(tabId: number): boolean {
        return this.activeTab === tabId;
    }

    setActiveTab(tabId: number): void {
        console.log("tabId", tabId);
        if(!tabId && tabId !== 0) return;
        this.activeTab = tabId;
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tabPayment: tabId },
            queryParamsHandling: 'merge',
        });
    }
}
