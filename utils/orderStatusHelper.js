const calculateOrderStatus = (orderItems) => {

    if (!orderItems || orderItems.length === 0) {
        return "processing";
    }

    const statuses = orderItems.map(item => item.status);

    const statusCount = {
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        returned: 0
    };

    statuses.forEach(status => {
        if (statusCount.hasOwnProperty(status)) {
            statusCount[status]++;
        }
    });

    const total = orderItems.length;

    if (statusCount.cancelled === total) return "cancelled";
    if (statusCount.returned === total) return "returned";
    if (statusCount.delivered === total) return "delivered";
    if (statusCount.shipped === total) return "shipped";
    if (statusCount.processing === total) return "processing";

    if (statusCount.cancelled > 0) {
        return "partially_cancelled";
    }

    if (statusCount.returned > 0) {
        return "partially_returned";
    }

    if (statusCount.delivered > 0) {
        return "partially_delivered";
    }

    if (statusCount.shipped > 0) {
        return "partially_shipped";
    }

    return "processing";
};

module.exports = {
    calculateOrderStatus
}