import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AlumnosService } from './alumnos.service';
import { GetAlumnosFilterDto } from './dto/get-alumnos-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('alumnos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlumnosController {
  constructor(private readonly alumnosService: AlumnosService) {}

  @Get()
  @Roles('Docente')
  findAll(@Query() filters: GetAlumnosFilterDto) {
    return this.alumnosService.findAll(filters);
  }
}
