"""
Catch KYC Interactive Dashboard

A Streamlit-based interactive dashboard for real-time analysis of stock watchlists
using Relative Strength, Momentum, and Z-Score metrics.

Usage:
    streamlit run catch_kyc_dashboard.py

Requirements:
    pip install streamlit pandas numpy seaborn matplotlib plotly
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# Page configuration
st.set_page_config(
    page_title="Catch KYC Heatmap",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================================
# UTILITY FUNCTIONS (Reused from main script)
# ============================================================================

def load_data(filepath: str) -> pd.DataFrame:
    """Load and pivot price data."""
    df = pd.read_csv(filepath, parse_dates=['Date'])
    price_data = df.pivot(index='Date', columns='Ticker', values='Close')
    return price_data.sort_index()


def clean_data(price_data: pd.DataFrame, benchmark: str, threshold: float) -> pd.DataFrame:
    """Clean price data by handling missing values."""
    if benchmark not in price_data.columns:
        st.error(f"Benchmark ticker '{benchmark}' not found in data")
        return None
    
    missing_pct = price_data.isnull().sum() / len(price_data)
    tickers_to_drop = missing_pct[missing_pct > threshold].index.tolist()
    
    if benchmark in tickers_to_drop:
        tickers_to_drop.remove(benchmark)
        price_data[benchmark] = price_data[benchmark].fillna(method='ffill').fillna(method='bfill')
    
    if tickers_to_drop:
        st.warning(f"Dropped {len(tickers_to_drop)} tickers with >{threshold*100}% missing data")
        price_data = price_data.drop(columns=tickers_to_drop)
    
    price_data = price_data.fillna(method='ffill').fillna(method='bfill')
    return price_data


def calculate_metrics(price_data: pd.DataFrame, benchmark: str, 
                     mom_window: int, z_window: int, rs_window: int = None):
    """Calculate all metrics."""
    returns = price_data.pct_change()
    
    # Relative Strength
    if rs_window:
        returns_subset = returns.iloc[-rs_window:]
    else:
        returns_subset = returns
    
    cumulative_returns = (1 + returns_subset).cumprod() - 1
    benchmark_returns = cumulative_returns[benchmark]
    relative_strength = cumulative_returns.div(benchmark_returns, axis=0).mean()
    
    # Momentum
    momentum = price_data.pct_change(mom_window).iloc[-1]
    
    # Z-Score
    rolling_mean = price_data.rolling(window=z_window).mean()
    rolling_std = price_data.rolling(window=z_window).std()
    z_score = (price_data.iloc[-1] - rolling_mean.iloc[-1]) / rolling_std.iloc[-1]
    
    # Combine
    metrics = pd.DataFrame({
        'RS': relative_strength,
        'Momentum': momentum,
        'Z-Score': z_score
    })
    
    if benchmark in metrics.index:
        metrics = metrics.drop(benchmark)
    
    return metrics.dropna()


def normalize_metrics(metrics: pd.DataFrame) -> pd.DataFrame:
    """Normalize metrics to 0-1 range."""
    return (metrics - metrics.min()) / (metrics.max() - metrics.min())


# ============================================================================
# DASHBOARD UI
# ============================================================================

def main():
    # Header
    st.title("📊 Catch KYC Heatmap Dashboard")
    st.markdown("Interactive analysis of stock watchlists using RS, Momentum, and Z-Score metrics")
    
    # Sidebar configuration
    st.sidebar.header("⚙️ Configuration")
    
    # File upload or use existing
    uploaded_file = st.sidebar.file_uploader(
        "Upload watchlist CSV (optional)",
        type=['csv'],
        help="CSV with columns: Date, Ticker, Close"
    )
    
    # Check if local file exists
    local_file = 'watchlist_prices.csv'
    has_local_file = Path(local_file).exists()
    
    if uploaded_file is None and not has_local_file:
        st.info("👈 Upload a CSV file or place 'watchlist_prices.csv' in the directory")
        
        # Show example format
        st.subheader("Expected CSV Format")
        example_df = pd.DataFrame({
            'Date': ['2024-01-01', '2024-01-01', '2024-01-02', '2024-01-02'],
            'Ticker': ['SPY', 'AAPL', 'SPY', 'AAPL'],
            'Close': [450.00, 180.00, 451.20, 181.50]
        })
        st.dataframe(example_df)
        return
    
    # Load data
    try:
        if uploaded_file is not None:
            price_data = load_data(uploaded_file)
            st.sidebar.success(f"✅ Loaded from upload: {len(price_data)} days, {len(price_data.columns)} tickers")
        else:
            price_data = load_data(local_file)
            st.sidebar.success(f"✅ Loaded from {local_file}: {len(price_data)} days, {len(price_data.columns)} tickers")
    except Exception as e:
        st.error(f"Error loading data: {str(e)}")
        st.error(f"Details: {type(e).__name__}")
        return
    
    # Parameters
    st.sidebar.subheader("Analysis Parameters")
    
    benchmark = st.sidebar.selectbox(
        "Benchmark Ticker",
        options=price_data.columns.tolist(),
        index=0 if 'SPY' not in price_data.columns else price_data.columns.tolist().index('SPY')
    )
    
    mom_window = st.sidebar.slider(
        "Momentum Window (days)",
        min_value=5,
        max_value=60,
        value=20,
        step=5
    )
    
    z_window = st.sidebar.slider(
        "Z-Score Window (days)",
        min_value=20,
        max_value=120,
        value=60,
        step=10
    )
    
    rs_window = st.sidebar.slider(
        "RS Trailing Window (days)",
        min_value=20,
        max_value=120,
        value=60,
        step=10
    )
    
    missing_threshold = st.sidebar.slider(
        "Missing Data Threshold (%)",
        min_value=0,
        max_value=20,
        value=5,
        step=1
    ) / 100
    
    # Clean data
    price_data = clean_data(price_data, benchmark, missing_threshold)
    if price_data is None:
        return
    
    # Calculate metrics
    try:
        metrics = calculate_metrics(price_data, benchmark, mom_window, z_window, rs_window)
        normalized_metrics = normalize_metrics(metrics)
    except Exception as e:
        st.error(f"Error calculating metrics: {str(e)}")
        return
    
    # Calculate composite score
    composite_score = normalized_metrics.mean(axis=1).sort_values(ascending=False)
    
    # Main content area
    tab1, tab2, tab3, tab4 = st.tabs(["📊 Heatmap", "🎯 Opportunities", "📈 Metrics", "📉 Charts"])
    
    # Tab 1: Heatmap
    with tab1:
        st.subheader("Interactive Heatmap")
        
        # Mobile-friendly: Show top N tickers only
        num_tickers = st.slider(
            "Number of tickers to display",
            min_value=5,
            max_value=len(composite_score),
            value=min(20, len(composite_score)),
            step=5,
            help="Reduce for better mobile viewing"
        )
        
        # Get top N tickers by composite score
        top_tickers = composite_score.head(num_tickers).index
        display_metrics = normalized_metrics.loc[top_tickers]
        display_raw = metrics.loc[top_tickers]
        
        # Create plotly heatmap
        fig = go.Figure(data=go.Heatmap(
            z=display_metrics.T.values,
            x=display_metrics.index,
            y=display_metrics.columns,
            colorscale='RdYlGn',
            text=display_raw.T.values.round(3),
            texttemplate='%{text}',
            textfont={"size": 8},
            colorbar=dict(title="Score"),
            hovertemplate='Ticker: %{x}<br>Metric: %{y}<br>Raw Value: %{text}<br>Normalized: %{z:.3f}<extra></extra>'
        ))
        
        fig.update_layout(
            title=f"Top {num_tickers} Opportunities - {price_data.index[-1].date()}",
            xaxis_title="Ticker",
            yaxis_title="Metric",
            height=max(300, num_tickers * 15),  # Dynamic height
            font=dict(size=10),
            xaxis=dict(tickangle=-45),
            margin=dict(l=80, r=80, t=80, b=80)
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        # Summary stats
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Tickers", len(metrics))
        with col2:
            st.metric("Date Range", f"{(price_data.index[-1] - price_data.index[0]).days} days")
        with col3:
            st.metric("Latest Date", str(price_data.index[-1].date()))
    
    # Tab 2: Opportunities
    with tab2:
        st.subheader("Ranked Trading Opportunities")
        
        # Create opportunities dataframe
        opportunities = pd.DataFrame({
            'Ticker': metrics.index,
            'Composite Score': composite_score.values,
            'RS (Raw)': metrics['RS'].values,
            'Momentum (Raw)': metrics['Momentum'].values,
            'Z-Score (Raw)': metrics['Z-Score'].values,
            'RS (Norm)': normalized_metrics['RS'].values,
            'Momentum (Norm)': normalized_metrics['Momentum'].values,
            'Z-Score (Norm)': normalized_metrics['Z-Score'].values
        })
        
        opportunities = opportunities.sort_values('Composite Score', ascending=False)
        
        # Color coding
        def color_score(val):
            if val > 0.7:
                return 'background-color: #90EE90'
            elif val > 0.4:
                return 'background-color: #FFFFE0'
            else:
                return 'background-color: #FFB6C1'
        
        styled_df = opportunities.style.applymap(
            color_score,
            subset=['Composite Score']
        ).format({
            'Composite Score': '{:.3f}',
            'RS (Raw)': '{:.3f}',
            'Momentum (Raw)': '{:.3f}',
            'Z-Score (Raw)': '{:.3f}',
            'RS (Norm)': '{:.3f}',
            'Momentum (Norm)': '{:.3f}',
            'Z-Score (Norm)': '{:.3f}'
        })
        
        st.dataframe(styled_df, use_container_width=True)
        
        # Download button
        csv = opportunities.to_csv(index=False)
        st.download_button(
            label="📥 Download Opportunities CSV",
            data=csv,
            file_name="opportunities_ranked.csv",
            mime="text/csv"
        )
    
    # Tab 3: Metrics
    with tab3:
        st.subheader("Detailed Metrics Analysis")
        
        # Metric selection
        selected_metric = st.selectbox(
            "Select Metric",
            options=['RS', 'Momentum', 'Z-Score', 'Composite Score']
        )
        
        if selected_metric == 'Composite Score':
            metric_data = composite_score
        else:
            metric_data = metrics[selected_metric].sort_values(ascending=False)
        
        # Bar chart
        fig = px.bar(
            x=metric_data.index,
            y=metric_data.values,
            labels={'x': 'Ticker', 'y': selected_metric},
            title=f"{selected_metric} by Ticker",
            color=metric_data.values,
            color_continuous_scale='RdYlGn'
        )
        
        fig.update_layout(height=500, showlegend=False)
        st.plotly_chart(fig, use_container_width=True)
        
        # Statistics
        st.markdown("### Summary Statistics")
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Mean", f"{metric_data.mean():.3f}")
        with col2:
            st.metric("Median", f"{metric_data.median():.3f}")
        with col3:
            st.metric("Std Dev", f"{metric_data.std():.3f}")
        with col4:
            st.metric("Range", f"{metric_data.max() - metric_data.min():.3f}")
    
    # Tab 4: Charts
    with tab4:
        st.subheader("Price Charts")
        
        st.info("👇 Select tickers from the dropdown below to view price performance and returns distribution")
        
        # Ticker selection - no default
        selected_tickers = st.multiselect(
            "Select Tickers to Chart",
            options=price_data.columns.tolist(),
            default=[],
            help="Choose one or more tickers to display charts"
        )
        
        if selected_tickers and len(selected_tickers) > 0:
            # Normalize prices to 100
            normalized_prices = price_data[selected_tickers] / price_data[selected_tickers].iloc[0] * 100
            
            fig = px.line(
                normalized_prices,
                title="Normalized Price Performance (Base 100)",
                labels={'value': 'Normalized Price', 'Date': 'Date', 'variable': 'Ticker'}
            )
            
            fig.update_layout(height=500, hovermode='x unified')
            st.plotly_chart(fig, use_container_width=True)
            
            # Returns distribution
            st.markdown("### Returns Distribution")
            returns = price_data[selected_tickers].pct_change().dropna()
            
            fig = go.Figure()
            for ticker in selected_tickers:
                fig.add_trace(go.Histogram(
                    x=returns[ticker],
                    name=ticker,
                    opacity=0.7
                ))
            
            fig.update_layout(
                title="Daily Returns Distribution",
                xaxis_title="Daily Return",
                yaxis_title="Frequency",
                barmode='overlay',
                height=400
            )
            
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("Please select at least one ticker from the dropdown above to view charts")
    
    # Footer
    st.sidebar.markdown("---")
    st.sidebar.markdown("### About")
    st.sidebar.info(
        "This dashboard analyzes stock watchlists using:\n\n"
        "- **Relative Strength**: Performance vs benchmark\n"
        "- **Momentum**: Rate of change\n"
        "- **Z-Score**: Statistical deviation\n\n"
        "Higher composite scores indicate stronger opportunities."
    )


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    main()
