import mongoose, { Document, Schema } from 'mongoose';

export interface IFile extends Document {
  name: string;
  type: string;
  size: number;
  owner: Schema.Types.ObjectId;
  folder: Schema.Types.ObjectId | null; // Virtual folder reference
  originalPath?: string; // Store original path from ZIP if applicable
  storageKey: string; // The actual filename in storage
  path: string;
  pathSegments: { name: string; id: Schema.Types.ObjectId }[];
  extension: string;
  isPinned: boolean;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const FileSchema = new Schema<IFile>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    folder: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    originalPath: { type: String }, // Store original path from ZIP if applicable
    storageKey: { type: String, required: true },
    path: { type: String, required: true },
    pathSegments: [
      {
        name: String,
        id: { type: Schema.Types.ObjectId }
      }
    ],
    extension: { type: String, required: true },
    isPinned: { type: Boolean, default: false },
    isShared: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

const File = mongoose.model<IFile>('File', FileSchema);

export default File;
