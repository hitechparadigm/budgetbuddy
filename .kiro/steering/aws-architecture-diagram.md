---
inclusion: manual
---

# AWS Architecture Diagram Generation

Generate validated AWS architecture diagrams as draw.io XML using official AWS4 icon libraries. Use this skill whenever you need to create, generate, or design AWS architecture diagrams, cloud infrastructure diagrams, or system design visuals. Also triggers for requests to visualize existing infrastructure from CloudFormation, CDK, or Terraform code.

## Workflow

### Step 1: Determine Mode

**Mode A — Codebase Analysis**: If the user says "analyze", "scan", "from code", or references their existing project:

1. Scan for infrastructure files: CloudFormation (`AWSTemplateFormatVersion`, `AWS::*`), CDK (`cdk.json`, construct definitions), Terraform (`resource "aws_*"`)
2. Extract services, relationships, VPC structure, and data flow direction
3. If NO AWS infrastructure files found, scan for non-AWS technologies: Dockerfiles, database configs, API integrations, ML frameworks, message brokers
4. For MIXED architectures (AWS + non-AWS): use AWS icons for AWS services, general icons for non-AWS
5. Confirm discovered architecture with user before generating
6. Ask which diagram type best represents the architecture

**Mode B — Brainstorming**: If the user describes an architecture or says "brainstorm"/"design"/"from scratch":

1. Ask 3-5 focused questions (purpose, services, scale, security, traffic pattern)
2. Propose the architecture with service recommendations and data flow
3. Iterate if needed, then generate

### Step 2: Styling Selections

- Sketch mode: OFF by default. Only activate if user says "sketch", "hand-drawn", or "sketchy"
- Legend panel: ON by default for 7+ services. Disable only if user says "no legend"
- Export format: Default `.drawio` only

### Step 3: Generate Diagram XML

1. Generate XML following all rules below
2. Apply styling selections from Step 2

### Step 4: Validate and Export

1. Write the `.drawio` file to `./docs/`
2. Verify XML is well-formed
3. If validation fails, fix errors and rewrite

## Defaults

- Font: `fontFamily=Helvetica`
- Icon size: 48x48 inside 120x120 containers
- Spacing: 180px horizontal, 120px vertical between service group containers
- Legend: ALWAYS for 7+ services (unless user opts out)
- Sketch mode: OFF (unless user explicitly requests)
- Grid: OFF (`grid=0`)
- File location: `./docs/` directory
- XML format: Uncompressed, wrapped in `<mxfile><diagram><mxGraphModel>`

## Style Rules

- Font: ALL text MUST use `fontFamily=Helvetica;`
- Region groups: MUST use `container=0` (decoration-only). Services use `parent="aws-cloud"` with absolute coords
- Group fontColor: MUST match the group's `strokeColor` (VPC: `#8C4FFF`, Public subnet: `#248814`, Private subnet: `#147EBA`, Region: `#00A4A6`)
- Font hierarchy: Title 30px bold > Subtitle 16px > Group 14px bold > Container 12px bold > Service 10px > Edge 11px
- Category containers: Every 48x48 icon MUST sit inside a 120x120 container with its category tint color
- Sketch mode: Only when user requests it. Add `sketch=1;curveFitting=1;jiggle=2` to non-icon elements. Keep `sketch=0` on service icons

## Diagram Types

- VPC/Network: VPC, subnets, security groups, NAT gateways, load balancers with group shapes
- Serverless: API Gateway, Lambda, DynamoDB, S3, Step Functions, EventBridge
- Multi-Region: Multiple regions with replication, Route 53, Global Accelerator
- CI/CD Pipeline: CodeCommit/GitHub -> CodeBuild -> CodeDeploy -> targets
- Data Flow/Analytics: Kinesis, S3, Glue, Athena, Redshift, QuickSight pipelines
- Container: ECS/EKS clusters, ECR, Fargate, load balancing
- Hybrid: On-premises + AWS with Direct Connect, VPN, Transit Gateway

## XML Generation Rules

### Required Structure

Always use the full `mxfile` wrapper:

```xml
<mxfile host="Electron" version="29.6.1">
  <diagram name="Page-1" id="diagram-1">
    <mxGraphModel dx="1200" dy="800" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="1100" pageHeight="850" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- All shapes and edges here -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

- Cell `id="0"` is the root layer; cell `id="1"` is the default parent (both always required)
- All diagram elements use `parent="1"` unless nested inside a container
- Use descriptive cell IDs: `vpc-1`, `lambda-orders`, `s3-assets`, `edge-lambda-to-dynamo`

### Key Principles

- ALWAYS use `mxgraph.aws4.*` namespace. Use `resourceIcon;resIcon=` for main service icons
- Container `value` = category label (e.g., "DNS", "Compute"). Icon `value` = service name + optional italic sub-label. NEVER put the service name on the container
- Edges connect to service icons, not containers. Use `exitX`/`exitY` and `entryX`/`entryY` (0-1) to control connection sides
- Edge labels are separate child cells with `connectable="0"` and `relative="1"` geometry
- Region groups use `container=0` (decoration-only). VPC/subnets use `container=1`
- Prefer flat layouts. Only use nested containers for real infrastructure boundaries (VPC, subnets, AZs)
- External actors use visible containers (`fillColor=#f5f5f5`), placed BELOW title block at y >= 140

## Layout Guidelines

- Spacing: 180px horizontal / 120px vertical gaps. For 13+ services, increase to 220px/160px
- Edge routing: Use `orthogonalEdgeStyle`. Add explicit waypoints for non-adjacent routing
- Multiple edges: Each outgoing edge MUST exit from a different point. Spread entry points when multiple edges enter the same target
- Step badges/legend: Teal `#007CBD` 28x28 badges near arrow sources. Right sidebar legend for 7+ services. Legend height MUST match diagram height
- Auxiliary services: Only CloudWatch, CloudTrail, X-Ray, IAM. No step numbers, no edges. Place in dashed "Auxiliary Services" group inside AWS Cloud boundary

## File Naming

Each diagram gets a descriptive filename in kebab-case, placed in `./docs/` (e.g., `docs/budgetbuddy-serverless-architecture.drawio`). Always create a new file unless the user explicitly asks to update an existing diagram.

## Important Rules

- NEVER use compressed/base64 diagram content
- NEVER invent shape names — only use valid `mxgraph.aws4.*` shapes
- ALWAYS wrap XML in `<mxfile><diagram><mxGraphModel>` — not bare `<mxGraphModel>`
- ALWAYS include cells id="0" and id="1" as root and default layer
- ALWAYS use `resourceIcon;resIcon=` style for main service icons
- ALWAYS set `container=1;pointerEvents=0;` on group shapes
- ALWAYS validate edge source/target IDs reference existing cells
- ALWAYS include a title block at the top of every diagram
- ALWAYS place 48x48 service icons inside colored category containers
- ALWAYS use `fontFamily=Helvetica;` in every style attribute
- For complex diagrams (7+ services), ALWAYS add step badges and legend
- Use descriptive cell IDs, not random strings
- Add italic sub-labels to service icons to clarify their role
- Only include services the user explicitly mentions or that are core to the data flow
- NEVER set a `background` attribute on mxGraphModel
- NEVER use double hyphens (`--`) inside XML comments
- Escape special characters in attribute values: `&amp;`, `&lt;`, `&gt;`, `&quot;`

## Output

1. Create the `docs/` directory if it does not exist
2. Save the diagram to `./docs/<descriptive-name>.drawio`
3. Present to the user: file path, diagram type, services included, and recommended alt text
