import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Status } from '../utils/constant';
import { Transaction } from '../models/transaction.model';
import sequelizeConnection from '../db/sequelize.db';
import { VoucherDetail } from '../models/voucher_detail.model';
import { Voucher } from '../models/voucher.model';
import { Destination } from '../models/destination.model';
import AppError from '../utils/app_error';
import { StatusCodes } from 'http-status-codes';

export const checkVoucherOrder = async (
    _req: Request,
    _res: Response,
    next: NextFunction
) => {
    try {
        const now = Date.now()
        const transactions = await Transaction.findAll({ where: { createdAt: { [Op.lte]: now - 1000 * 60 * 15 }, status: Status.processing } });
        await sequelizeConnection.transaction(async (order) => {
            await VoucherDetail.update({ status: 'Sold', usedAt: null }, { where: { status: 'Pending', usedAt: { [Op.lte]: now - 1000 * 60 * 15 } } })
            for (let i = 0; i < transactions.length; i++)
                await VoucherDetail.update({ status: Status.inStock, travelerID: null }, { where: { id: transactions[i].voucherDetailID }, transaction: order })
            await Transaction.update({ status: Status.failed }, { where: { createdAt: { [Op.lte]: now - 1000 * 60 * 15 }, status: Status.processing }, transaction: order })
        })
        const voucher = await Voucher.findAll({ where: { toDate: { [Op.lte]: (now - 1000 * 3600 * 24) }, status: { [Op.and]: [{ [Op.ne]: Status.draft }, { [Op.ne]: Status.expired }] } } });
        await sequelizeConnection.transaction(async (refundExpired) => {
            for (let i = 0; i < voucher.length; i++) {
                const detail = await VoucherDetail.findAll({ where: { voucherID: voucher[i].id, status: 'Sold' } })
                for (let j = 0; j < detail.length; j++) {
                    detail[j].finalPrice = Math.ceil(detail[j].price * (100 - detail[j].refundRate) * (100 - detail[j].commissionRate) / 10) / 1000
                    detail[j].status = 'Refunded'

                    const refund = new Transaction()
                    refund.voucherDetailID = detail[j].id
                    refund.travelerID = detail[j].travelerID as string
                    var format = require('date-format')
                    var orderId = format('hhmmss', new Date())
                    refund.orderID = orderId
                    refund.orderInfo = 'Refund ' + detail[j].code
                    refund.amount = Math.ceil(detail[j].price * (100 - detail[j].refundRate)) * 10
                    refund.vnpTransactionNo = (Date.now() + '').substring(5)
                    refund.vnpTransactionStatus = '00'
                    refund.transactionType = 'Refund'
                    refund.status = 'Success'

                    const income = new Transaction()
                    income.voucherDetailID = detail[j].id
                    const voucher = await Voucher.findOne({ where: { id: detail[j].voucherID }, attributes: ['destinationID'] })
                    if (!voucher)
                        throw new AppError('Có lỗi xảy ra!', StatusCodes.INTERNAL_SERVER_ERROR)
                    const des = await Destination.findOne({ where: { id: voucher.destinationID }, attributes: ['supplierID'] })
                    if (!des)
                        throw new AppError('Có lỗi xảy ra!', StatusCodes.INTERNAL_SERVER_ERROR)
                    income.travelerID = des.supplierID ?? ''
                    orderId = format('hhmmss', new Date())
                    income.orderID = orderId
                    income.orderInfo = 'Income ' + detail[j].code
                    income.amount = (detail[j].finalPrice ?? 0) * 1000
                    income.vnpTransactionNo = (Date.now() + '').substring(5)
                    income.vnpTransactionStatus = '00'
                    income.transactionType = 'Income'
                    income.status = 'Success'

                    await refund.save({ transaction: refundExpired })
                    await income.save({ transaction: refundExpired })
                    await detail[j].save({ transaction: refundExpired })
                }
                voucher[i].status = Status.expired
                await voucher[i].save({ transaction: refundExpired })
            }
        })
        next();
    } catch (err: any) {
        next(err);
    }
};

