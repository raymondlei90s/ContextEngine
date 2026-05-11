/**
 * Create Project DTO
 */

import { IsString, IsEnum, IsOptional, IsUrl } from 'class-validator';
import { DocFramework, TargetAudience, DocStyle } from '../../../core/types.js';

export class CreateProjectDto {
  @IsString()
  name!: string;

  @IsUrl()
  repoUrl!: string;

  @IsEnum(['github', 'gitlab'])
  @IsOptional()
  repoType?: 'github' | 'gitlab';

  @IsEnum(['mintlify', 'docusaurus', 'vitepress', 'starlight', 'docus', 'docsify'])
  @IsOptional()
  docFramework?: DocFramework;

  @IsEnum(['developers', 'end-users', 'mixed'])
  @IsOptional()
  targetAudience?: TargetAudience;

  @IsEnum(['api-reference', 'user-guide', 'tutorial', 'how-to', 'explanatory'])
  @IsOptional()
  docStyle?: DocStyle;
}
