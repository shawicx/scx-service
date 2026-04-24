import { BeforeInsert, PrimaryColumn } from 'typeorm';
import { ulid } from 'ulid';

export abstract class BaseEntity {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = ulid();
    }
  }
}
