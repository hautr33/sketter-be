import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { Destination } from "../../models/destination.model";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import { Voucher } from "../../models/voucher.model";
import { Roles, Status } from "../../utils/constant";
import { PAGE_LIMIT, VNP_HASH_SECRET, VNP_RETURN_URL, VNP_TMN_CODE, VNP_URL } from "../../config/default";
import crypto from 'crypto';
import { Op } from "sequelize";
import { User } from "../../models/user.model";
import sequelizeConnection from "../../db/sequelize.db";
import { VoucherDetail } from "../../models/voucher_detail.model";
import { Transaction } from "../../models/transaction.model";

/**
 * This controller is createVoucher that create new voucher of destination
 *
 */
export const createVoucher = catchAsync(async (req, res, next) => {
    const { name, image, destinationID, description, quantity, value, salePrice, refundRate, fromDate, toDate } = req.body;

    const today = Math.floor((Date.now() - new Date(fromDate).getTime()) / (1000 * 3600 * 24))
    if (today >= 0)
        return next(new AppError('Bạn phải khuyến mãi trước khi khuyến mãi bắt đầu 1 ngày', StatusCodes.BAD_REQUEST))

    const destination = await Destination.findOne({ where: { id: destinationID, supplierID: res.locals.user.id, status: Status.open }, attributes: ['name'] });
    if (!destination || destination === null)
        return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND));
    const user = await User.findOne({ where: { id: res.locals.user.id }, attributes: ['commissionRate'] })
    const voucher = new Voucher();
    voucher.name = name
    voucher.image = image
    voucher.destinationID = destinationID
    voucher.description = description
    voucher.quantity = quantity
    voucher.value = value
    voucher.salePrice = salePrice
    voucher.refundRate = refundRate
    voucher.fromDate = fromDate
    voucher.toDate = toDate
    user ? voucher.commissionRate = user.commissionRate : 0
    await voucher.save()
    const result = await Voucher.findOne({
        where: { id: voucher.id },
        attributes: ['id', 'name', 'image', 'description', 'quantity', 'totalSold', 'value', 'salePrice', 'discountPercent', 'fromDate', 'toDate', 'status'],
        include: [
            {
                model: Destination, as: 'destinationApply',
                attributes: ['id', 'name', 'address', 'image', 'status']
            }
        ]
    })
    res.resDocument = new RESDocument(StatusCodes.OK, `Đã thêm khuyến mãi vào địa điểm '${destination.name}'`, { voucher: result });
    next()
})


/**
 * This controller is getAllVoucher that get all vouchers of supplier
 *
 */
export const getActiveVoucher = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const name = req.query.name as string ?? '';

    const vouchers = await Voucher.findAll({
        where: { name: { [Op.iLike]: `%${name}%` }, status: 'Activated' },
        attributes: ['id', 'name', 'image', 'quantity', 'totalSold', 'value', 'salePrice', 'discountPercent', 'fromDate', 'toDate'], include: [
            {
                model: Destination, as: 'destinationApply',
                attributes: ['id', 'name', 'address', 'image', 'status']
            }
        ],
        order: [['updatedAt', 'DESC']],
        offset: (page - 1) * PAGE_LIMIT,
        limit: PAGE_LIMIT
    })

    const count = await Voucher.findAll(
        {
            where: { name: { [Op.iLike]: `%${name}%` }, status: 'Activated' },
            attributes: ['id'],
            include: [
                {
                    model: Destination, as: 'destinationApply',
                    attributes: []
                }
            ],
        });

    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { count: count.length, vouchers: vouchers }
    )

    if (count.length != 0) {
        const maxPage = Math.ceil(count.length / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;
    next()
})

/**
 * This controller is getAllVoucher that get all vouchers of supplier
 *
 */
export const getAllVoucher = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const name = req.query.name as string ?? '';
    const isDraft = req.query.isDraft == 'true' ? true : false

    const vouchers = await Voucher.findAll({
        where: { name: { [Op.iLike]: `%${name}%` }, status: isDraft ? 'Draft' : { [Op.ne]: 'Draft' } },
        attributes: ['id', 'name', 'quantity', 'totalSold', 'status', 'updatedAt'], include: [
            {
                model: Destination, as: 'destinationApply',
                where: { supplierID: res.locals.user.id },
                attributes: ['id', 'name', 'address', 'image', 'status']
            }
        ],
        order: [['updatedAt', 'DESC']],
        offset: (page - 1) * PAGE_LIMIT,
        limit: PAGE_LIMIT
    })

    const count = await Voucher.findAll(
        {
            where: { name: { [Op.iLike]: `%${name}%` }, status: isDraft ? 'Draft' : { [Op.ne]: 'Draft' } },
            attributes: ['id'],
            include: [
                {
                    model: Destination, as: 'destinationApply',
                    where: { supplierID: res.locals.user.id },
                    attributes: []
                }
            ],
        });

    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { count: count.length, vouchers: vouchers }
    )

    if (count.length != 0) {
        const maxPage = Math.ceil(count.length / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;
    next()
})

/**
 * This controller is getAllVoucher that get all vouchers of supplier
 *
 */
export const getDestinationVoucher = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const vouchers = await Voucher.findAll({
        where: { status: Status.activated, destinationID: req.params.id },
        attributes: ['id', 'name', 'image', 'quantity', 'totalSold', 'value', 'salePrice', 'discountPercent', 'fromDate', 'toDate'],
        order: [['name', 'ASC']],
        offset: (page - 1) * PAGE_LIMIT,
        limit: PAGE_LIMIT
    })

    const count = await Voucher.findAll(
        {
            where: { status: Status.activated, destinationID: req.params.id },
            attributes: ['id'],
        });

    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { count: count.length, vouchers: vouchers }
    )

    if (count.length != 0) {
        const maxPage = Math.ceil(count.length / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;
    next()
})

/**
 * This controller is getAllVoucher that get all vouchers of supplier
 *
 */
export const getAllVoucherDetail = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const code = req.query.code as string ?? '';

    const vouchers = await VoucherDetail.findAll({
        where: { voucherID: req.params.id, code: { [Op.iLike]: `%${code}%` } },
        attributes: ['code', 'finalPrice', 'status', 'soldAt', 'usedAt'], include: [
            {
                model: User, as: 'travelerInfo',
                attributes: ['email', 'name', 'avatar']
            }
        ],
        order: [['status', 'DESC'], ['usedAt', 'DESC'], ['soldAt', 'DESC']],
        offset: (page - 1) * PAGE_LIMIT,
        limit: PAGE_LIMIT
    })

    const count = await VoucherDetail.findAll(
        {
            where: { voucherID: req.params.id, code: { [Op.iLike]: `%${code}%` } },
            attributes: ['id'],
        });

    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { count: count.length, vouchers: vouchers }
    )

    if (count.length != 0) {
        const maxPage = Math.ceil(count.length / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;
    next()
})


/**
 * This controller is getAllVoucher that get all vouchers of supplier
 *
 */
export const getOwnVoucher = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const isViewHistory = req.query.isViewHistory == 'true' ? true : false
    const vouchers = await VoucherDetail.findAll({
        where: { travelerID: res.locals.user.id, status: isViewHistory ? { [Op.or]: ['Used', 'Refunded'] } : { [Op.or]: ['Sold', 'Pending'] } },
        attributes: ['code', 'status', 'soldAt'], include: [
            {
                model: Voucher, as: 'details',
                attributes: ['id', 'name', 'image', 'description', 'quantity', 'totalSold', 'value', 'salePrice', 'refundRate', 'discountPercent', 'fromDate', 'toDate', 'status'],
                include: getOneInclude(true, res.locals.user.id)
            }
        ],
        order: [['status', 'ASC'], ['details', 'toDate', 'ASC']],
        offset: (page - 1) * PAGE_LIMIT,
        limit: PAGE_LIMIT
    })

    const count = await VoucherDetail.findAll(
        {
            where: { travelerID: res.locals.user.id, status: isViewHistory ? { [Op.or]: ['Used', 'Refunded'] } : { [Op.or]: ['Sold', 'Pending'] } },
            attributes: ['status'], include: [
                {
                    model: Voucher, as: 'details',
                    where: isViewHistory ? {} : { status: Status.activated },
                    attributes: []
                }
            ],
        });

    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { count: count.length, vouchers: vouchers }
    )

    if (count.length != 0) {
        const maxPage = Math.ceil(count.length / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;
    next()
})


/**
 * This controller is getOneVoucher that get all vouchers of supplier
 *
 */
export const getOneVoucher = catchAsync(async (req, res, next) => {
    const isTraveler = res.locals.user.roleID === Roles.Traveler ? true : false;
    const query = isTraveler ? { id: req.params.id, status: Status.activated } : { id: req.params.id }
    const voucher = await Voucher.findOne({
        where: query,
        attributes: ['id', 'name', 'image', 'description', 'quantity', 'totalSold', 'totalUsed', 'value', 'salePrice', 'refundRate', 'commissionRate', 'discountPercent', 'fromDate', 'toDate', 'status'],
        include: getOneInclude(isTraveler, res.locals.user.id)
    })

    if (!voucher || voucher === null)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND))

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { voucher })
    next()
})

/**
 * This controller is activeVoucher that active a draft voucher
 *
 */
export const activeVoucher = catchAsync(async (req, res, next) => {
    const voucher = await Voucher.findOne({
        where: { id: req.params.id, status: 'Draft' },
    })

    if (!voucher || voucher === null)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND))

    const today = Math.floor((Date.now() - new Date(voucher.fromDate).getTime()) / (1000 * 3600 * 24))
    if (today >= 0)
        return next(new AppError('Bạn phải kích hoạt trước khi khuyến mãi bắt đầu 1 ngày', StatusCodes.BAD_REQUEST))

    await Voucher.update({ status: 'Activated' }, { where: { id: req.params.id } })
    for (let i = 0; i < voucher.quantity; i++) {
        const code = Math.random().toString(36).toUpperCase().substring(2, 8)
        const count = await VoucherDetail.count({ where: { voucherID: req.params.id, code: code } })
        if (count > 0)
            i -= 1
        else {
            const detail = new VoucherDetail()
            detail.voucherID = voucher.id
            detail.price = voucher.salePrice
            detail.refundRate = voucher.refundRate
            detail.commissionRate = voucher.commissionRate ?? 5
            detail.code = code
            await detail.save()
        }
    }

    res.resDocument = new RESDocument(StatusCodes.OK, 'Kích hoạt khuyến mãi thành cônng', null)
    next()
})


/**
 * This controller is activeVoucher that active a draft voucher
 *
 */
export const stopVoucher = catchAsync(async (req, res, next) => {
    const voucher = await Voucher.findOne({
        where: { id: req.params.id, status: 'Activated' },
    })

    if (!voucher || voucher === null)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND))

    await Voucher.update({ status: 'Stop' }, { where: { id: req.params.id } })

    res.resDocument = new RESDocument(StatusCodes.OK, `Đã ngưng chương trình khuyến mãi ${voucher.name} thành công`, null)
    next()
})

/**
 * This controller is updateVoucher that update a draft voucher
 *
 */
export const updateVoucher = catchAsync(async (req, res, next) => {
    const { name, image, destinationID, description, quantity, value, salePrice, refundRate, fromDate, toDate } = req.body;

    if (destinationID) {
        const destination = await Destination.findOne({ where: { id: destinationID, supplierID: res.locals.user.id, status: Status.open }, attributes: ['name'] });
        if (!destination || destination === null)
            return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND));
    }

    const voucher = await Voucher.findOne({
        where: { id: req.params.id, status: Status.draft },
        attributes: ['id', 'name', 'image', 'description', 'quantity', 'totalSold', 'value', 'salePrice', 'refundRate', 'discountPercent', 'fromDate', 'toDate', 'status'],
        include: [
            {
                model: Destination, as: 'destinationApply',
                where: { supplierID: res.locals.user.id },
                attributes: []
            }
        ]
    })
    if (!voucher || voucher === null)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND));

    name ? voucher.name = name : 0
    image ? voucher.image = image : 0
    destinationID ? voucher.destinationID = destinationID : 0
    description ? voucher.description = description : 0
    quantity ? voucher.quantity = quantity : 0
    value ? voucher.value = value : 0
    salePrice ? voucher.salePrice = salePrice : 0
    refundRate ? voucher.refundRate = refundRate : 0
    fromDate ? voucher.fromDate = fromDate : 0
    toDate ? voucher.toDate = toDate : 0
    await voucher.save()

    const result = await Voucher.findOne({
        where: { id: req.params.id },
        attributes: ['id', 'name', 'image', 'description', 'quantity', 'totalSold', 'value', 'salePrice', 'discountPercent', 'fromDate', 'toDate', 'status'],
        include: [
            {
                model: Destination, as: 'destinationApply',
                attributes: ['id', 'name', 'address', 'image', 'status']
            }
        ]
    })
    res.resDocument = new RESDocument(StatusCodes.OK, `Cập nhật khuyến mãi thành công`, { voucher: result });
    next()
})


/**
 * This controller is deleteVoucher that delete a draft voucher
 *
 */
export const deleteVoucher = catchAsync(async (req, res, next) => {
    const voucher = await Voucher.findOne({
        where: { id: req.params.id, status: Status.draft },
        attributes: ['id'],
        include: [
            {
                model: Destination, as: 'destinationApply',
                where: { supplierID: res.locals.user.id },
                attributes: []
            }
        ]
    })
    if (!voucher || voucher === null)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND));

    await voucher.destroy()
    res.resDocument = new RESDocument(StatusCodes.NO_CONTENT, 'Xoá khuyến mãi thành công', null)
    next()
})


/**
 * This controller is deleteVoucher that delete a draft voucher
 *
 */
export const buyVoucher = catchAsync(async (req, res, next) => {
    const count = await Voucher.count({ where: { id: req.params.id as string, status: 'Activated' } })
    if (count !== 1)
        throw new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND)
    const voucher = await VoucherDetail.findOne({
        where: { voucherID: req.params.id, status: Status.inStock }
    })
    if (!voucher || voucher === null)
        throw new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND)

    const url = await sequelizeConnection.transaction(async (payment) => {
        voucher.status = Status.paying
        voucher.travelerID = res.locals.user.id
        await voucher.save({ transaction: payment })

        const transaction = new Transaction();
        transaction.voucherDetailID = voucher.id
        transaction.travelerID = res.locals.user.id
        // const ipAddr = req.socket.remoteAddress; | '127.0.0.1'
        var ipAddr = req.socket.remoteAddress
        while (ipAddr?.includes(':'))
            ipAddr = ipAddr.replace(':', '%3A')

        var tmnCode = VNP_TMN_CODE;
        var secretKey = VNP_HASH_SECRET;
        var vnpUrl = VNP_URL;
        var returnUrl = VNP_RETURN_URL;
        // var returnUrl = 'https%3A%2F%2Fdomainmerchant.vn%2FReturnUrl'

        var date = new Date();
        var format = require('date-format');

        var createDate = format('yyyyMMddhhmmss', date);
        var orderId = format('hhmmss', date);
        transaction.orderID = orderId

        var amount = Math.ceil(voucher.price * 1000);
        transaction.amount = amount
        var bankCode = '';

        var orderInfo = 'V+' + voucher.code
        transaction.orderInfo = orderInfo.replace('+', ' ')
        var orderType = 'other';
        var locale = 'vn';
        if (locale === null || locale === '') {
            locale = 'vn';
        }
        var currCode = 'VND';
        var vnp_Params: any = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        // vnp_Params['vnp_Merchant'] = ''
        vnp_Params['vnp_Locale'] = locale;
        vnp_Params['vnp_CurrCode'] = currCode;
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = orderInfo;
        vnp_Params['vnp_OrderType'] = orderType;
        vnp_Params['vnp_Amount'] = amount * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;
        if (bankCode !== null && bankCode !== '') {
            vnp_Params['vnp_BankCode'] = bankCode;
        }

        const sorted = Object.keys(vnp_Params)
            .sort()
            .reduce((accumulator: any, key) => {
                accumulator[key] = vnp_Params[key];

                return accumulator;
            }, {});
        vnp_Params = sorted

        var querystring = require('qs');
        var signData = querystring.stringify(vnp_Params, { encode: false });
        var hmac = crypto.createHmac("sha512", secretKey);
        var signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

        vnp_Params['vnp_SecureHash'] = signed;

        vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });
        await transaction.save({ transaction: payment })
        return vnpUrl
    })

    res.resDocument = new RESDocument(StatusCodes.OK, 'Tạo đơn hàng thành công', url)
    next()
})


/**
 * This controller is getVnpReturn that return of VNPAY payment return
 *
 */
export const getVnpReturn = catchAsync(async (req, res, next) => {

    // const text = 'V+' + Math.random().toString(36).toUpperCase().substring(2, 8)
    let vnp_Params = req.query;

    var secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params['vnp_OrderInfo'] = (vnp_Params['vnp_OrderInfo'] as string).replace(' ', '+')
    const sorted = Object.keys(vnp_Params)
        .sort()
        .reduce((accumulator: any, key) => {
            accumulator[key] = vnp_Params[key];

            return accumulator;
        }, {});
    vnp_Params = sorted

    var secretKey = VNP_HASH_SECRET;


    var querystring = require('qs');
    var signData = querystring.stringify(vnp_Params, { encode: false });
    var crypto = require("crypto");
    var hmac = crypto.createHmac("sha512", secretKey);
    var signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    if (secureHash === signed) {
        //Kiem tra xem du lieu trong db co hop le hay khong va thong bao ket qua
        const amount = req.query.vnp_Amount ? parseInt(req.query.vnp_Amount as string) : 0

        const transaction = await Transaction.findOne({
            where: {
                orderID: req.query.vnp_TxnRef as string,
                orderInfo: (req.query.vnp_OrderInfo as string).replace('+', ' '),
                amount: Math.floor(amount / 100),
                status: 'Processing'
            }
        })

        if (!transaction)
            return res.redirect('https://sketter-fe.pages.dev/transactionResult?result=fail')
        await sequelizeConnection.transaction(async (payment) => {
            transaction.vnpTransactionNo = vnp_Params['vnp_TransactionNo'] as string
            transaction.vnpTransactionStatus = vnp_Params['vnp_TransactionStatus'] as string
            if (vnp_Params['vnp_ResponseCode'] == '00') {
                transaction.status = Status.success
                await transaction.save({ transaction: payment })
                const voucherDetail = await VoucherDetail.findOne({ where: { id: transaction.voucherDetailID }, attributes: ['voucherID'], transaction: payment });
                if (!voucherDetail)
                    throw new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND)
                await VoucherDetail.update({ status: Status.sold, soldAt: new Date(Date.now()) }, { where: { id: transaction.voucherDetailID }, transaction: payment })
                const count = await VoucherDetail.count({ where: { status: { [Op.and]: [{ [Op.ne]: Status.inStock }, { [Op.ne]: Status.paying }] }, voucherID: voucherDetail.voucherID }, transaction: payment })
                const voucher = await Voucher.findOne({ where: { id: voucherDetail.voucherID } });
                if (!voucher)
                    throw new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND)
                voucher.totalSold = count;
                if (voucher.quantity == count)
                    voucher.status = Status.soldOut
                await voucher.save({ transaction: payment })
            } else {
                transaction.status = Status.failed
                await transaction.save({ transaction: payment })
                await VoucherDetail.update({ status: Status.inStock, travelerID: null }, { where: { id: transaction.voucherDetailID }, transaction: payment })
            }
        })
        if (vnp_Params['vnp_ResponseCode'] == '00') {
            return res.redirect('https://sketter-fe.pages.dev/transactionResult?result=success')
        }
        else {
            return res.redirect('https://sketter-fe.pages.dev/transactionResult?result=fail')
        }
    } else {
        return next(new AppError('Fail checksum', StatusCodes.BAD_REQUEST))
    }
})

/**
 * This controller is updateVoucher that update a draft voucher
 *
 */
export const duplicateVoucher = catchAsync(async (req, res, next) => {
    const targetVoucher = await Voucher.findOne({
        where: { id: req.params.id },
        attributes: ['id', 'destinationID', 'name', 'image', 'description', 'quantity', 'value', 'salePrice', 'refundRate', 'fromDate', 'toDate'],
        include: [
            {
                model: Destination, as: 'destinationApply',
                where: { supplierID: res.locals.user.id },
                attributes: []
            }
        ]
    })
    if (!targetVoucher || targetVoucher === null)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND));
    const voucher = new Voucher()
    voucher.name = targetVoucher.name + ' (Bản sao)'
    voucher.destinationID = targetVoucher.destinationID
    voucher.image = targetVoucher.image
    voucher.description = targetVoucher.description
    voucher.quantity = targetVoucher.quantity
    voucher.value = targetVoucher.value
    voucher.salePrice = targetVoucher.salePrice
    voucher.refundRate = targetVoucher.refundRate
    voucher.fromDate = targetVoucher.fromDate
    voucher.toDate = targetVoucher.toDate
    await voucher.save()

    const result = await Voucher.findOne({
        where: { id: voucher.id },
        attributes: ['id', 'name', 'image', 'description', 'quantity', 'totalSold', 'value', 'salePrice', 'discountPercent', 'fromDate', 'toDate', 'status'],
        include: [
            {
                model: Destination, as: 'destinationApply',
                attributes: ['id', 'name', 'address', 'image', 'status']
            }
        ]
    })
    res.resDocument = new RESDocument(StatusCodes.OK, `Đã tạo bản sao của khuyến mãi '${targetVoucher.name}'`, { voucher: result });
    next()
})

/**
 * This controller is useVoucher that to use voucher
 *
 */
export const useVoucher = catchAsync(async (req, res, next) => {
    const check = await Voucher.findOne({
        where: {
            id: req.query.id as string,
            status: { [Op.or]: ['Activated', 'Sold Out'] }
        },
        attributes: ['id', 'fromDate', 'toDate']
    })
    if (!check)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND))

    const count = await VoucherDetail.count({
        where: {
            travelerID: res.locals.user.id,
            code: req.query.code as string,
            voucherID: req.query.id as string,
            status: 'Sold',
        }
    })
    if (count != 1)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND))


    if (Math.floor((new Date(check.fromDate).getTime() - Date.now()) / (1000 * 3600 * 24)) >= 0)
        return next(new AppError('Chương trình khuyến mãi chưa bắt đầu, vui lòng thử lại sau', StatusCodes.BAD_REQUEST))

    await VoucherDetail.update(
        {
            usedAt: new Date(Date.now()), status: 'Pending'
        },
        {
            where: { travelerID: res.locals.user.id, code: req.query.code as string, voucherID: req.query.id as string }
        })
    res.resDocument = new RESDocument(StatusCodes.OK, 'Khuyến mãi của bạn đang được xác nhận để sử dụng', null)
    next()
})



/**
 * This controller is confirmUseVoucher that allow supplier to confirm used voucher
 *
 */
export const confirmUseVoucher = catchAsync(async (req, res, next) => {
    const voucher = await Voucher.findOne({
        where: { id: req.query.id as string, status: { [Op.or]: ['Activated', 'Sold Out'] } }, include: [
            {
                model: Destination, as: 'destinationApply',
                where: { supplierID: res.locals.user.id, status: 'Open' },
                attributes: ['id']
            }
        ]
    })
    if (voucher == null)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND))
    const detail = await VoucherDetail.findOne({ where: { code: req.query.code as string, voucherID: req.query.id as string, status: 'Pending' } })

    if (detail == null)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND))

    detail.finalPrice = Math.ceil(detail.price * (100 - detail.commissionRate) * 10) / 1000
    detail.status = 'Used'
    await sequelizeConnection.transaction(async (confirm) => {
        await detail.save({ transaction: confirm })
        await Voucher.increment({ totalUsed: 1 }, { where: { id: detail.voucherID }, transaction: confirm })
        const transaction = new Transaction()
        transaction.voucherDetailID = detail.id
        transaction.travelerID = res.locals.user.id
        var date = new Date();
        var format = require('date-format');
        var orderId = format('hhmmss', date);
        transaction.orderID = orderId
        transaction.orderInfo = 'Income ' + detail.code
        transaction.amount = (detail.finalPrice ?? 0) * 1000
        transaction.vnpTransactionNo = (Date.now() + '').substring(5)
        transaction.vnpTransactionStatus = '00'
        transaction.transactionType = 'Income'
        transaction.status = 'Success'
        await transaction.save({ transaction: confirm })

    })
    res.resDocument = new RESDocument(StatusCodes.OK, 'Khuyến mãi đã được sử dụng thành công', null)
    next()
})




/**
 * This controller is getTransactions that allow user to view transaction
 *
 */
export const getTransactions = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)

    const isAdmin = res.locals.user.roleID == Roles.Admin ? true : false
    const transactions = await Transaction.findAll({
        where: isAdmin ? {} : { travelerID: res.locals.user.id },
        attributes: ['id', 'orderID', 'orderInfo', 'amount', 'transactionType', 'status', 'createdAt'],
        include: [
            {
                model: User, as: 'user', attributes: ['email', 'name', 'avatar']
            },
            {
                model: VoucherDetail, as: 'detail', attributes: ['code'], include: [
                    { model: Voucher, as: 'voucherInfo', attributes: ['name', 'image'] }
                ]
            }
        ],
        order: [['createdAt', 'DESC']],
        offset: (page - 1) * PAGE_LIMIT,
        limit: PAGE_LIMIT
    })

    const count = await Transaction.findAll({
        where: isAdmin ? {} : { travelerID: res.locals.user.id },
        attributes: ['id']
    })

    if (isAdmin) {
        let revenue = 0
        let expense = 0
        const tmp = await Transaction.findAll({
            where: { status: 'Success' },
            attributes: ['id', 'orderInfo', 'amount', 'transactionType']
        })
        const list1 = []
        let list2: any[] = []
        for (let i = 0; i < tmp.length; i++) {
            if (['Income', 'Refund'].includes(tmp[i].transactionType ?? ''))
                list1.push(tmp[i])
            else
                list2.push(tmp[i])
        }
        for (let i = 0; i < list1.length; i++) {
            expense += list1[i].amount
            let isCheck = false
            let j = 0
            while (!isCheck && j < list2.length) {
                if (list1[i].orderInfo.includes(list2[j].orderInfo.split(' ')[1])) {
                    revenue += list2[j].amount
                    const id = list2[j].id
                    list2 = list2.filter(function (value) {
                        return value.id != id
                    });

                    isCheck = true
                } else
                    j++
            }
        }
        const profit = revenue - expense
        // Create a response object
        const resDocument = new RESDocument(
            StatusCodes.OK,
            'success',
            {
                count: count.length,
                overview: {
                    revenue: revenue,
                    expense: expense,
                    profit: profit
                },
                transactions: transactions
            }
        )
        if (count.length != 0) {
            const maxPage = Math.ceil(count.length / PAGE_LIMIT)
            resDocument.setCurrentPage(page)
            resDocument.setMaxPage(maxPage)
        }
        res.resDocument = resDocument;
    } else {

        const resDocument = new RESDocument(
            StatusCodes.OK,
            'success',
            {
                count: count.length,
                transactions: transactions
            }
        )
        if (count.length != 0) {
            const maxPage = Math.ceil(count.length / PAGE_LIMIT)
            resDocument.setCurrentPage(page)
            resDocument.setMaxPage(maxPage)
        }
        res.resDocument = resDocument;
    }

    next()
})

/**
 * This controller is getListDestnation that get all destinatiion of a supplier to create voucher
 *
 */
export const getListDestnation = catchAsync(async (_req, res, next) => {
    const destinations = await Destination.findAll({
        where: { supplierID: res.locals.user.id, status: Status.open },
        attributes: ['id', 'name', 'address'],
        order: [['name', 'ASC']]
    })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', destinations)
    next()
})

const getOneInclude = (isTraveler: boolean, supplierID: string) => [
    {
        model: Destination, as: 'destinationApply',
        where: isTraveler ? { status: Status.open } : { supplierID: supplierID },
        attributes: ['id', 'name', 'address', 'image', 'status']
    }
]
