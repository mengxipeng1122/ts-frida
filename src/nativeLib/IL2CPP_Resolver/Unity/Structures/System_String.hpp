#pragma once

#include "utils.h"
#include <locale>
#include <codecvt>
#include <string>

namespace Unity
{
	struct System_String : il2cppObject
	{
		int m_iLength;
		char16_t m_wString[1024];

		void Clear()
		{
			if (!this) return;

			memset(m_wString, 0, static_cast<size_t>(m_iLength) * 2);
			m_iLength = 0;
		}

		std::string ToString()
		{
		    if (!this) return "";

			std::string sRet = utf16_to_utf8(m_wString, m_iLength);

		    return sRet;
		}
	};
}
