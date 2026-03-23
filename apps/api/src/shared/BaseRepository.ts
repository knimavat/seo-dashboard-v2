import { Model, FilterQuery, UpdateQuery, QueryOptions, PipelineStage } from 'mongoose';

export class BaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  async findAll(agencyId: string, filter: FilterQuery<T> = {}, options: QueryOptions = {}): Promise<{ data: any[]; meta: any }> {
    const { page = 1, limit = 25, sort = { createdAt: -1 } } = options as any;
    const skip = (page - 1) * limit;
    const query = { agencyId, deletedAt: null, ...filter } as FilterQuery<T>;
    const [data, total] = await Promise.all([
      this.model.find(query).sort(sort).skip(skip).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findById(agencyId: string, id: string): Promise<any> {
    return this.model.findOne({ _id: id, agencyId, deletedAt: null } as FilterQuery<T>).lean();
  }

  async findOne(agencyId: string, filter: FilterQuery<T> = {}): Promise<any> {
    return this.model.findOne({ agencyId, deletedAt: null, ...filter } as FilterQuery<T>).lean();
  }

  async create(agencyId: string, data: Partial<T>): Promise<any> {
    const doc = new this.model({ ...data, agencyId });
    return (await doc.save()).toObject();
  }

  async updateById(agencyId: string, id: string, update: UpdateQuery<T>): Promise<any> {
    return this.model
      .findOneAndUpdate(
        { _id: id, agencyId, deletedAt: null } as FilterQuery<T>,
        { ...update, updatedAt: new Date() },
        { new: true, runValidators: true }
      )
      .lean();
  }

  async softDelete(agencyId: string, id: string): Promise<any> {
    return this.model
      .findOneAndUpdate(
        { _id: id, agencyId, deletedAt: null } as FilterQuery<T>,
        { deletedAt: new Date() } as any,
        { new: true }
      )
      .lean();
  }

  async count(agencyId: string, filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments({ agencyId, deletedAt: null, ...filter } as FilterQuery<T>);
  }

  async aggregate(agencyId: string, pipeline: PipelineStage[]): Promise<any[]> {
    return this.model.aggregate([
      { $match: { agencyId, deletedAt: null } as any },
      ...pipeline,
    ]);
  }
}