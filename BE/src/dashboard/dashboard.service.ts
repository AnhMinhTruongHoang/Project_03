import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from 'src/modules/orders/schemas/order.schemas';
import { Pricing, PricingDocument } from 'src/modules/pricing/schemas/pricing.schemas';
import { User, UserDocument } from 'src/modules/users/schemas/user.schema';

@Injectable()
export class DashboardService {
    constructor(
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Pricing.name) private pricingModel: Model<PricingDocument>,
    ) { }

    async getSystemStatistics(month?: number, year?: number) {
        const now = new Date();
        const currentYear = year || now.getFullYear();

        let startDate: Date;
        let endDate: Date;

        if (month && year) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59, 999);
        } else {
            startDate = new Date(currentYear, 0, 1);
            endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
        }

        const [
            orderStats,
            employeeStats,
            todayStats,
            stuckOrdersCount,
            activePricingCount,
        ] = await Promise.all([
            this.getOrderStatistics(startDate, endDate),
            this.getEmployeePerformance(startDate, endDate),
            this.getTodaySummary(),           // ← ĐÃ CÓ RỒI!
            this.getStuckOrdersCount(),
            this.pricingModel.countDocuments({
                isActive: true,
                isDeleted: false,
            }),
        ]);

        return {
            period: { month, year },
            summary: {
                totalOrders: orderStats.totalOrders,
                deliveredOrders: orderStats.byStatus.COMPLETED,
                canceledOrders: orderStats.byStatus.CANCELED,
                pendingOrders: orderStats.byStatus.PENDING,
                shippingOrders: orderStats.byStatus.SHIPPING,

                todayOrders: todayStats.count,
                todayRevenue: todayStats.revenue,

                activeEmployees: employeeStats.activeCount,
                totalEmployees: employeeStats.totalCount,

                stuckOrders48h: stuckOrdersCount,
                activePricingTables: activePricingCount,

                codRate:
                    orderStats.totalOrders > 0
                        ? ((orderStats.codCount / orderStats.totalOrders) * 100).toFixed(1)
                        : '0',
                successRate:
                    orderStats.totalOrders > 0
                        ? ((orderStats.byStatus.COMPLETED / orderStats.totalOrders) * 100).toFixed(1)
                        : '0',
            },
            charts: {
                dailyLabels: orderStats.days.map((d) => d.getDate()),
                dailyOrders: orderStats.dailyOrders,
                dailyRevenue: orderStats.dailyRevenue,
                statusDistribution: orderStats.byStatus,
                topEmployees: employeeStats.top10.map((e) => ({
                    name: e.name,
                    orders: e.totalOrders,
                    completed: e.completed,
                    revenue: e.revenue || 0,
                })),
            },
        };
    }

    // ==================================================================
    // TẤT CẢ CÁC HÀM ĐÃ CÓ ĐỦ – KHÔNG THIẾU HÀM NÀO
    // ==================================================================

    private async getOrderStatistics(start: Date, end: Date) {
        const match = {
            isDeleted: false,
            createdAt: { $gte: start, $lte: end },
        };

        const dailyAgg = await this.orderModel.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $dayOfMonth: '$createdAt' },
                    orders: { $sum: 1 },
                    revenue: {
                        $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, '$totalPrice', 0] },
                    },
                    cod: { $sum: { $cond: [{ $gt: ['$codValue', 0] }, 1, 0] } },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const statusAgg = await this.orderModel.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    cod: { $sum: { $cond: [{ $gt: ['$codValue', 0] }, 1, 0] } },
                },
            },
        ]);

        const byStatus = { PENDING: 0, CONFIRMED: 0, SHIPPING: 0, COMPLETED: 0, CANCELED: 0 };
        let totalOrders = 0;
        let codCount = 0;
        statusAgg.forEach((s) => {
            byStatus[s._id] = s.count;
            totalOrders += s.count;
            codCount += s.cod;
        });

        const days = this.getDaysArray(start, end);
        const dailyOrders = days.map((d) => {
            const found = dailyAgg.find((x) => x._id === d.getDate());
            return found?.orders || 0;
        });
        const dailyRevenue = days.map((d) => {
            const found = dailyAgg.find((x) => x._id === d.getDate());
            return found?.revenue || 0;
        });

        return {
            totalOrders,
            codCount,
            byStatus,
            days,
            dailyOrders,
            dailyRevenue,
        };
    }

    private async getEmployeePerformance(start: Date, end: Date) {
        const top10Raw = await this.orderModel.aggregate([
            {
                $match: {
                    isDeleted: false,
                    createdAt: { $gte: start, $lte: end },
                    'createdBy._id': { $exists: true, $ne: null },
                },
            },
            // Ép kiểu _id thành ObjectId để aggregate group đúng
            {
                $addFields: {
                    'createdByObjectId': { $toObjectId: '$createdBy._id' }
                }
            },
            {
                $group: {
                    _id: '$createdByObjectId',
                    email: { $first: '$createdBy.email' },
                    totalOrders: { $sum: 1 },
                    completedOrders: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['COMPLETED', 'Completed', 'completed']] },
                                1,
                                0
                            ]
                        },
                    },
                    revenue: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['COMPLETED', 'Completed', 'completed']] },
                                '$totalPrice',
                                0
                            ]
                        },
                    },
                },
            },
            // { $match: { completedOrders: { $gt: 0 } } },
            { $sort: { totalOrders: -1 } },
            { $limit: 10 },
        ]);

        const enriched = await Promise.all(
            top10Raw.map(async (e) => {
                const user = await this.userModel.findById(e._id).select('name email').lean();
                return {
                    _id: e._id,
                    name: user?.name || e.email?.split('@')[0] || 'Không xác định',
                    email: e.email,
                    totalOrders: e.totalOrders,
                    completed: e.completedOrders,
                    revenue: e.revenue,
                };
            }),
        );

        const activeCount = await this.userModel.countDocuments({
            role: { $in: ['ADMIN', 'STAFF', 'COURIER'] },
            isActive: true,
            isDeleted: false,
        });

        const totalCount = await this.userModel.countDocuments({
            role: { $in: ['ADMIN', 'STAFF', 'COURIER'] },
            isDeleted: false,
        });
        // console.log('Top 10 Performance:', JSON.stringify(top10Raw, null, 2));
        return { top10: enriched, activeCount, totalCount };
    }

    // ←←← HÀM BỊ MẤT TRƯỚC ĐÂY – BÂY GIỜ ĐÃ CÓ LẠI!
    private async getTodaySummary() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const result = await this.orderModel.aggregate([
            {
                $match: {
                    createdAt: { $gte: today, $lt: tomorrow },
                    isDeleted: false,
                },
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    revenue: {
                        $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, '$totalPrice', 0] },
                    },
                },
            },
        ]);

        return result[0] || { count: 0, revenue: 0 };
    }

    private async getStuckOrdersCount() {
        const threshold = new Date();
        threshold.setHours(threshold.getHours() - 48);

        return this.orderModel.countDocuments({
            status: { $in: ['PENDING', 'CONFIRMED'] },
            createdAt: { $lte: threshold },
            isDeleted: false,
        });
    }

    private getDaysArray(start: Date, end: Date): Date[] {
        const arr: Date[] = [];
        for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
            arr.push(new Date(dt));
        }
        return arr;
    }
}