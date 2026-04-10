document.addEventListener('DOMContentLoaded', () => {
    const CSV_URL = 'data.csv'; // Update this to your raw GitHub/server URL in production
    const REFRESH_RATE = 15000; // 15 seconds

    const heatmapBody = document.getElementById('heatmap-body');
    const biasText = document.getElementById('bias-text');
    const meterFill = document.getElementById('meter-fill');
    const timestampEl = document.getElementById('timestamp');
    const toggleHighImpact = document.getElementById('high-impact-toggle');

    let globalData = [];

    // --- Core Logic ---

    // Utility: Parse numbers from strings like "250K", "3.5%"
    const parseEconomicValue = (str) => {
        if (!str) return 0;
        // Strip everything except digits, decimals, and minus signs
        const cleaned = str.replace(/[^\d.-]/g, '');
        return parseFloat(cleaned);
    };

    // Calculate Bias Engine Score
    const calculateBias = (data) => {
        let totalScore = 0;
        let maxPossibleScore = 0;

        data.forEach(row => {
            const actual = parseEconomicValue(row.Actual);
            const forecast = parseEconomicValue(row.Forecast);
            
            // Skip calculation if data is incomplete
            if (isNaN(actual) || isNaN(forecast)) return;

            // Determine weight
            let weight = 1;
            if (row.Impact === 'High') weight = 3;
            if (row.Impact === 'Medium') weight = 2;
            
            maxPossibleScore += weight;

let diff = actual - forecast;

// AUTOMATIC INVERSE LOGIC: Detects Unemployment or Claims
const isInverse = row.Correlation === 'Inverse' || 
                  row.Indicator.toLowerCase().includes('unemployment') || 
                  row.Indicator.toLowerCase().includes('claims');

if (isInverse) {
    diff = diff * -1; // Flips the math: Higher actual now results in a negative (Bearish) number
}

if (diff > 0) {
    totalScore += weight; // Bullish
} else if (diff < 0) {
    totalScore -= weight; // Bearish
}
        });

        // Normalize score between -100 and +100
        const percentage = maxPossibleScore === 0 ? 0 : (totalScore / maxPossibleScore) * 100;
        updateBiasUI(percentage);
    };

    // Update UI Elements
    const updateBiasUI = (score) => {
        let label = "Neutral";
        let colorClass = "neutral-text";
        let meterColor = "var(--neutral-color)";

        if (score >= 40) {
            label = "Strong Bullish";
            colorClass = "bullish-text";
            meterColor = "var(--bullish-color)";
        } else if (score > 10 && score < 40) {
            label = "Mild Bullish";
            colorClass = "bullish-text";
            meterColor = "rgba(0, 230, 118, 0.7)";
        } else if (score <= -40) {
            label = "Strong Bearish";
            colorClass = "bearish-text";
            meterColor = "var(--bearish-color)";
        } else if (score < -10 && score > -40) {
            label = "Mild Bearish";
            colorClass = "bearish-text";
            meterColor = "rgba(255, 61, 87, 0.7)";
        }

        // Update Text
        biasText.textContent = `${label} (${score > 0 ? '+' : ''}${score.toFixed(1)})`;
        biasText.className = colorClass;

        // Map score (-100 to 100) to meter width (0% to 100%)
        const mappedWidth = ((score + 100) / 200) * 100;
        meterFill.style.width = `${mappedWidth}%`;
        meterFill.style.backgroundColor = meterColor;
    };

  const renderTable = (data) => {
        heatmapBody.innerHTML = '';
        const showHighImpactOnly = toggleHighImpact.checked;

        // 1. Define Category Keywords
        const CATEGORIES = {
            "Inflation & Prices": ["CPI", "PCE", "PPI", "Inflation"],
            "Economic Growth & Activity": ["GDP", "PMI", "Retail", "Confidence", "Building", "Manufacturing", "Services"],
            "Jobs & Employment": ["JOLTS", "ADP", "Non-Farm", "NFP", "Earnings", "Job", "Payroll"],
            "Unemployment": ["Unemployment", "Claims"],
            "Monetary Policy (Other)": ["Federal Funds", "Rate", "Monetary", "FOMC"]
        };

        // Helper function to sort indicator into category
        const getCategory = (indicatorName) => {
            const name = indicatorName.toLowerCase();
            // Force Unemployment check first so it doesn't accidentally land in Jobs
            if (name.includes('unemployment') || name.includes('claims')) return "Unemployment";

            for (const [category, keywords] of Object.entries(CATEGORIES)) {
                if (keywords.some(kw => name.includes(kw.toLowerCase()))) {
                    return category;
                }
            }
            return "Other Indicators";
        };

        // 2. Group Data by Category
        const groupedData = {
            "Inflation & Prices": [],
            "Economic Growth & Activity": [],
            "Jobs & Employment": [],
            "Unemployment": [],
            "Monetary Policy (Other)": [],
            "Other Indicators": []
        };

        data.forEach(row => {
            if (showHighImpactOnly && row.Impact !== 'High') return;
            const cat = getCategory(row.Indicator);
            if (groupedData[cat]) {
                groupedData[cat].push(row);
            }
        });

        // 3. Render Groups to Table
        Object.keys(groupedData).forEach(category => {
            const rowsInCategory = groupedData[category];
            
            // Skip rendering the category if it has no data
            if (rowsInCategory.length === 0) return;

            // Create Category Header Row
            const headerTr = document.createElement('tr');
            headerTr.className = "category-row";
            headerTr.innerHTML = `<td colspan="6">${category}</td>`;
            heatmapBody.appendChild(headerTr);

            // Create Indicator Rows
            rowsInCategory.forEach(row => {
                const actualNum = parseEconomicValue(row.Actual);
                const forecastNum = parseEconomicValue(row.Forecast);
                
                let resultClass = "neutral-text";
                let effectLabel = "Neutral";

                if (!isNaN(actualNum) && !isNaN(forecastNum)) {
                    let diff = actualNum - forecastNum;
                    
                    // AUTOMATIC INVERSE LOGIC: Detects Unemployment or Claims
                    const isInverse = row.Correlation === 'Inverse' || 
                                      row.Indicator.toLowerCase().includes('unemployment') || 
                                      row.Indicator.toLowerCase().includes('claims');

                    if (isInverse) {
                        diff = diff * -1; // Flips the math
                    }

                    if (diff > 0) { 
                        resultClass = "bullish-text"; 
                        effectLabel = "Bullish"; 
                    } else if (diff < 0) { 
                        resultClass = "bearish-text"; 
                        effectLabel = "Bearish"; 
                    }
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight: 600; padding-left: 2rem;">${row.Indicator}</td>
                    <td><span class="impact-badge impact-${row.Impact.toLowerCase()}">${row.Impact}</span></td>
                    <td style="color: var(--text-muted)">${row.Previous}</td>
                    <td>${row.Forecast}</td>
                    <td class="${resultClass}" style="font-weight: 800;">${row.Actual}</td>
                    <td class="${resultClass}">${effectLabel}</td>
                `;
                heatmapBody.appendChild(tr);
            });
        });
    };

    const parseCSV = (text) => {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length === headers.length) {
                let row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
        }
        return data;
    };

    const fetchAndUpdate = async () => {
        try {
            // Add cache-busting query param to ensure fresh data fetch
            const response = await fetch(`${CSV_URL}?t=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Data fetch failed');
            
            const csvText = await response.text();
            globalData = parseCSV(csvText);
            
            renderTable(globalData);
            calculateBias(globalData);
            
            const now = new Date();
            timestampEl.textContent = `Last Updated: ${now.toLocaleTimeString()}`;
            
        } catch (error) {
            console.error("Error loading CSV:", error);
            biasText.textContent = "Data Error";
            biasText.className = "bearish-text";
        }
    };

    // --- Initialization ---
    
    toggleHighImpact.addEventListener('change', () => renderTable(globalData));

    // Initial Fetch
    fetchAndUpdate();

    // Setup Polling
    setInterval(fetchAndUpdate, REFRESH_RATE);
});
