const calculateOrderStatus = (orderItems) => {
    const statuses = orderItems.map(item => item.status);

    const allProcessing = statuses.every(s => s === "processing");
    const allShipped = statuses.every(s => s === "shipped");
    const allDelivered = statuses.every(s => s === "delivered");
    const allCancelled = statuses.every(s => s === "cancelled");
    const allReturned = statuses.every(s => s === "returned");

    const someShipped = statuses.includes("shipped");
    const someDelivered = statuses.includes("delivered");
    const someCancelled = statuses.includes("cancelled");
    const someReturned = statuses.includes("returned");

    if (allCancelled) return "cancelled";
    if (allDelivered) return "delivered";
    if (allShipped) return "shipped";
    if (allProcessing) return "processing";

    if (someDelivered) return "partially_delivered";
    if (someShipped) return "partially_shipped";
    if (someCancelled) return "partially_cancelled";
    if (someReturned) return "partially_returned";


    return "processing";

}

module.exports = {
    calculateOrderStatus
}