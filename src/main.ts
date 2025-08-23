
type Direction = 'buy' | 'sell';

class Order {
	direction: Direction
	quantity: number
	limit_price: number

	constructor(direction: Direction, quantity: number, limit_price: number) {
		this.direction = direction
		this.quantity = quantity
		this.limit_price = limit_price
	}
}


class OrderBook {
	buy_orders: Order[] = [];
	sell_orders: Order[] = [];
	total_stock_executed: number = 0;

	process_order(direction: Direction, qty: number, limit_price: number) {

	}
}

const ob = new OrderBook();
ob.process_order('buy', 1, 100)
ob.process_order('buy', 1, 100)
ob.process_order('buy', 1, 100)

for (let i = 0; i < ob.buy_orders.length; i++) {
	const bo = ob.buy_orders[i]
	console.log(bo);
}