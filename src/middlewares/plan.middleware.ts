import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelizeConnection from '../db/sequelize.db';
import { Plan } from '../models/plan.model';

export const checkPlanStatus = async (
    _req: Request,
    _res: Response,
    next: NextFunction
) => {
    try {
        const now = Date.now()
        await sequelizeConnection.transaction(async (plan) => {
            await Plan.update({ status: 'Activated' }, { where: { fromDate: { [Op.lte]: now }, status: 'Planned' }, transaction: plan })
            await Plan.update({ status: 'Skipped' }, { where: { toDate: { [Op.lte]: (now - 1000 * 3600 * 24 * 2) }, status: 'Activated' }, transaction: plan })
        })
        next();
    } catch (err: any) {
        next(err);
    }
};

