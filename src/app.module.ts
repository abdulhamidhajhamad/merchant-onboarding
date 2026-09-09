import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';
import { DatabaseModule } from './modules/database/database.module';
import { DocumentModule } from './modules/document/document.module';
import { MccModule } from './modules/mcc/mcc.module';
import { ApplicationModule } from './modules/application/application.module'; 

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    DatabaseModule,
    DocumentModule,
    MccModule,
    ApplicationModule, 
  ],
})
export class AppModule {}