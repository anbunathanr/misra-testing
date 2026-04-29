FROM public.ecr.aws/lambda/nodejs:18

# Install system dependencies for Chromium
RUN yum install -y \
    chromium \
    chromium-libs \
    nss \
    nspr \
    atk \
    at-spi2-atk \
    cups-libs \
    libdrm \
    libxcb \
    libxkbcommon \
    pango \
    libxcomposite \
    libxdamage \
    libxfixes \
    libxrandr \
    libxshmfence \
    libxss \
    libxtst \
    xorg-x11-fonts-Type1 \
    xorg-x11-fonts-75dpi \
    xorg-x11-fonts-100dpi \
    xorg-x11-fonts-misc \
    xorg-x11-font-utils \
    && yum clean all

# Copy package files
COPY package*.json ./

# Install Node dependencies (production only)
RUN npm ci --only=production

# Copy built application
COPY dist/ ${LAMBDA_TASK_ROOT}/

# Set the CMD to your handler
CMD [ "handler.handler" ]
