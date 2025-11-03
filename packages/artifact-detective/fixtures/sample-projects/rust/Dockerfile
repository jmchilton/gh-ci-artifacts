FROM rust:1.75.0-slim

WORKDIR /workspace

# Copy project files
COPY . .

# Output directory mounted as volume
RUN mkdir -p /output

# Install clippy and rustfmt (usually included but make sure)
RUN rustup component add clippy rustfmt
