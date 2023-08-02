import { ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Catalog } from './catalog.model';
import { Destination } from './destination.model';

export class DestinationCatalog extends Model<InferAttributes<DestinationCatalog>, InferCreationAttributes<DestinationCatalog>> {
    destinationID!: ForeignKey<Destination['id']>;
    catalogName!: ForeignKey<Catalog['name']>;
}

DestinationCatalog.init({
    // Model attributes are defined here
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'DestinationCatalog' // We need to choose the model name
});